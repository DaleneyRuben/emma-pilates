import {
  createPendingUpload,
  finalizeUpload,
  getPutPendingUploadObjectUrl,
  getUploadStatus,
  type CreatePendingUploadDtoMediaType,
  type CreatePendingUploadDtoPurpose,
} from "@pilates/api-contracts";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { decodeBase64, encodeBase64 } from "@pilates/mobile-core";

// The Client app's upload protocol (UPL-001): pick from the library, convert
// what the API does not accept, then declare, put, finalize, and poll until
// the worker has rebuilt the image (ADR-0072, ADR-0073). Receipts and the
// profile photo share it; each attaches the READY asset in its own way.
export type PickedImage = {
  uri: string;
  mediaType: CreatePendingUploadDtoMediaType;
  bytes: Uint8Array<ArrayBuffer>;
};

const verificationPollMilliseconds = 700;
const verificationPollAttempts = 40;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const idempotency = () => ({
  headers: { "idempotency-key": Crypto.randomUUID() },
});

// MOB-065: the system photo picker runs outside the app (PHPicker on iOS, the
// photo picker on Android), so no photo library permission is asked for.
export async function pickImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    // The original, so the photo is encoded only once, by ensureAcceptedFormat.
    quality: 1,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;
  const { uri, mediaType } = await ensureAcceptedFormat(asset);
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri, mediaType, bytes: decodeBase64(base64) };
}

// UPL-003: the studio's readable receipt is 2048 px on its longest side
// (ADR-0073), so nothing larger is worth sending over a phone network. Every
// pick, whatever its format, is re-encoded once as JPEG at that size: a
// 12-megapixel photo or a PNG screenshot shrinks from megabytes to a few
// hundred kilobytes, and HEIC or an unknown type becomes an accepted format.
const uploadMaxEdge = 2048;
const uploadJpegQuality = 0.8;

async function ensureAcceptedFormat(asset: {
  uri: string;
  width?: number;
  height?: number;
}): Promise<{ uri: string; mediaType: CreatePendingUploadDtoMediaType }> {
  const converted = await ImageManipulator.manipulateAsync(asset.uri, downscaleActions(asset), {
    compress: uploadJpegQuality,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: converted.uri, mediaType: "image/jpeg" };
}

function downscaleActions({ width = 0, height = 0 }: { width?: number; height?: number }) {
  if (Math.max(width, height) <= uploadMaxEdge) return [];
  return width >= height
    ? [{ resize: { width: uploadMaxEdge } }]
    : [{ resize: { height: uploadMaxEdge } }];
}

// Declares, uploads, finalizes, and waits until the worker has verified the
// image; resolves with the READY asset id.
export async function uploadImage(
  image: PickedImage,
  purpose: CreatePendingUploadDtoPurpose,
  fetcher: typeof globalThis.fetch,
  sleep: (milliseconds: number) => Promise<void> = wait,
): Promise<string> {
  // expo-crypto's native digest only accepts typed arrays, never a bare buffer.
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, image.bytes);
  const declared = await createPendingUpload(
    {
      purpose,
      mediaType: image.mediaType,
      byteSize: image.bytes.byteLength,
      checksum: encodeBase64(new Uint8Array(digest)),
    },
    undefined,
    fetcher,
  );
  if (declared.status !== 201) throw new Error("upload_declaration_failed");
  const imageAssetId = declared.data.id;

  const stored = await fetcher(getPutPendingUploadObjectUrl(imageAssetId), {
    method: "PUT",
    headers: { "Content-Type": image.mediaType },
    body: image.bytes.buffer.slice(
      image.bytes.byteOffset,
      image.bytes.byteOffset + image.bytes.byteLength,
    ) as ArrayBuffer,
  });
  if (!stored.ok) throw new Error("upload_failed");

  const finalized = await finalizeUpload(imageAssetId, idempotency(), fetcher);
  if (finalized.status !== 202) throw new Error("upload_finalization_failed");

  for (let attempt = 0; attempt < verificationPollAttempts; attempt += 1) {
    const status = await getUploadStatus(imageAssetId, undefined, fetcher);
    if (status.status === 200 && status.data.state === "ready") break;
    if (status.status === 200 && status.data.state === "failed") {
      throw new Error("upload_rejected");
    }
    if (attempt === verificationPollAttempts - 1) {
      throw new Error("upload_verification_timeout");
    }
    await sleep(verificationPollMilliseconds);
  }

  return imageAssetId;
}
