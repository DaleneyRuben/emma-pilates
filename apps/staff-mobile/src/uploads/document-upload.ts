import { decodeBase64 } from "@pilates/mobile-core";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import type { PickedImage } from "./image-upload";

// The backend's invoice limit (FIX-044, `image-purpose.ts`): a PDF over it is
// refused here, before any byte is sent.
const invoiceMaxBytes = 10 * 1024 * 1024;

const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const startsLikePdf = (bytes: Uint8Array) => pdfSignature.every((byte, at) => bytes[at] === byte);

const withPdfEnding = (name: string) => (/\.pdf$/i.test(name) ? name : `${name}.pdf`);

/**
 * FIX-049, E5 «Elegir un PDF»: one PDF from the phone's files (Archivos on
 * iOS, the system picker on Android), read whole and uploaded as it is, under
 * its own name. Cancelled returns null; a file the studio cannot take (over
 * 10 MB, or not a PDF inside) throws `upload_rejected`, as the worker would.
 */
export async function pickPdf(): Promise<PickedImage | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets?.[0];
  if (asset === undefined) return null;
  if ((asset.size ?? 0) > invoiceMaxBytes) throw new Error("upload_rejected");

  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = decodeBase64(base64);
  // Some providers report no type, or application/octet-stream, for a real
  // PDF (FIX-049 review): its first bytes decide, as on the worker.
  if (bytes.byteLength > invoiceMaxBytes || !startsLikePdf(bytes)) {
    throw new Error("upload_rejected");
  }
  return {
    uri: asset.uri,
    bytes,
    mediaType: "application/pdf",
    fileName: withPdfEnding(asset.name),
  };
}
