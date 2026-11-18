import { decodeBase64 } from "@pilates/mobile-core";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import type { PickedImage } from "./image-upload";

// The backend's invoice limit (FIX-044, `image-purpose.ts`): a PDF over it is
// refused here, before any byte is sent.
const invoiceMaxBytes = 10 * 1024 * 1024;

const withPdfEnding = (name: string) => (/\.pdf$/i.test(name) ? name : `${name}.pdf`);

/**
 * FIX-049, E5 «Elegir un PDF»: one PDF from the phone's files (Archivos on
 * iOS, the system picker on Android), read whole and uploaded as it is, under
 * its own name. Cancelled returns null; a file the studio cannot take throws
 * `upload_rejected`, as the worker would.
 */
export async function pickPdf(): Promise<PickedImage | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets?.[0];
  if (asset === undefined) return null;
  if (asset.mimeType !== "application/pdf" || (asset.size ?? 0) > invoiceMaxBytes) {
    throw new Error("upload_rejected");
  }

  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return {
    uri: asset.uri,
    bytes: decodeBase64(base64),
    mediaType: "application/pdf",
    fileName: withPdfEnding(asset.name),
  };
}
