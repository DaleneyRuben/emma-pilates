import { getGetCurrentClientInvoiceFileUrl } from "@pilates/api-contracts";
import { encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import { Platform, Share } from "react-native";

import { loadDownloadsFolder } from "./downloads-folder";

export type DownloadOutcome = "shared" | "downloads" | "saved" | "cancelled";

const safeName = (fileName: string) => fileName.replace(/[\\/:*?"<>|#%]/g, "_");

/**
 * K2/K3 «Descargar» (FIX-044) with what the app already ships: the file is
 * fetched with her credential into the cache, then on iOS the system share
 * sheet offers «Guardar en Archivos», Mail or WhatsApp. On Android (FIX-049)
 * it goes straight to Descargas; only a build without the app's downloads
 * module, or Android 9 and older, still asks for a folder, starting in
 * Documents.
 */
export async function downloadInvoice(input: {
  fetcher: typeof globalThis.fetch;
  paymentId: string;
  fileName: string;
  mediaType: string;
}): Promise<DownloadOutcome> {
  // The raw response, as `loadPrivateImage` reads receipts: React Native's
  // Blob has no arrayBuffer().
  const response = await input.fetcher(getGetCurrentClientInvoiceFileUrl(input.paymentId));
  if (!response.ok) throw new Error("invoice_download_failed");
  const base64 = encodeBase64(new Uint8Array(await response.arrayBuffer()));
  const name = safeName(input.fileName);

  const local = `${FileSystem.cacheDirectory}${name}`;
  if (Platform.OS === "android") {
    const downloads = loadDownloadsFolder();
    if (downloads !== null) {
      await FileSystem.writeAsStringAsync(local, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // A MediaStore failure (FIX-049 review) still leaves her the picker.
      const inDownloads = await downloads
        .saveAsync(local, name, input.mediaType)
        .catch(() => false);
      await FileSystem.deleteAsync(local, { idempotent: true }).catch(() => undefined);
      if (inDownloads) return "downloads";
    }
    const access = FileSystem.StorageAccessFramework;
    // Android 11 and later refuse the storage root and Download itself as a
    // folder an app may write to, so the picker opens in Documents.
    const folder = await access.requestDirectoryPermissionsAsync(
      access.getUriForDirectoryInRoot("Documents"),
    );
    if (!folder.granted) return "cancelled";
    const target = await access.createFileAsync(
      folder.directoryUri,
      name.replace(/\.[a-z0-9]+$/i, ""),
      input.mediaType,
    );
    await FileSystem.writeAsStringAsync(target, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return "saved";
  }

  await FileSystem.writeAsStringAsync(local, base64, { encoding: FileSystem.EncodingType.Base64 });
  const shared = await Share.share({ url: local });
  return shared.action === Share.dismissedAction ? "cancelled" : "shared";
}
