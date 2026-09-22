import {
  attachPurchaseIntentReceipt,
  createPendingUpload,
  finalizeUpload,
  getPutPendingUploadObjectUrl,
  getUploadStatus,
  type CreatePendingUploadDtoMediaType,
} from "@pilates/api-contracts";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { decodeBase64, encodeBase64 } from "@pilates/mobile-core";

export type PickedReceipt = {
  uri: string;
  mediaType: CreatePendingUploadDtoMediaType;
  bytes: Uint8Array;
};

export type AttachedReceipt = { imageAssetId: string; localUri: string };

const acceptedMediaTypes: ReadonlySet<string> = new Set<CreatePendingUploadDtoMediaType>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const verificationPollMilliseconds = 700;
const verificationPollAttempts = 40;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const idempotency = () => ({ headers: { "idempotency-key": Crypto.randomUUID() } });

export async function pickReceipt(): Promise<PickedReceipt | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;
  const { uri, mediaType } = await ensureAcceptedFormat(asset);
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri, mediaType, bytes: decodeBase64(base64) };
}

// iPhone photos are usually HEIC, which the studio cannot review; anything
// outside the accepted set (or without a known type) is re-encoded as JPEG.
async function ensureAcceptedFormat(asset: {
  uri: string;
  mimeType?: string;
}): Promise<{ uri: string; mediaType: CreatePendingUploadDtoMediaType }> {
  if (asset.mimeType !== undefined && acceptedMediaTypes.has(asset.mimeType)) {
    return {
      uri: asset.uri,
      mediaType: asset.mimeType as CreatePendingUploadDtoMediaType,
    };
  }
  const converted = await ImageManipulator.manipulateAsync(asset.uri, [], {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: converted.uri, mediaType: "image/jpeg" };
}

// Declares, uploads, finalizes, and waits until the worker has verified the
// receipt, then attaches it to the open Purchase Intent.
export async function uploadReceipt(
  receipt: PickedReceipt,
  purchaseIntentId: string,
  fetcher: typeof globalThis.fetch,
  sleep: (milliseconds: number) => Promise<void> = wait,
): Promise<AttachedReceipt> {
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    receipt.bytes.buffer.slice(
      receipt.bytes.byteOffset,
      receipt.bytes.byteOffset + receipt.bytes.byteLength,
    ) as ArrayBuffer,
  );
  const declared = await createPendingUpload(
    {
      purpose: "transfer_receipt",
      mediaType: receipt.mediaType,
      byteSize: receipt.bytes.byteLength,
      checksum: encodeBase64(new Uint8Array(digest)),
    },
    undefined,
    fetcher,
  );
  if (declared.status !== 201) throw new Error("upload_declaration_failed");
  const imageAssetId = declared.data.id;

  const stored = await fetcher(getPutPendingUploadObjectUrl(imageAssetId), {
    method: "PUT",
    headers: { "Content-Type": receipt.mediaType },
    body: receipt.bytes.buffer.slice(
      receipt.bytes.byteOffset,
      receipt.bytes.byteOffset + receipt.bytes.byteLength,
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

  const attached = await attachPurchaseIntentReceipt(
    purchaseIntentId,
    { imageAssetId },
    idempotency(),
    fetcher,
  );
  if (attached.status !== 200) throw new Error("receipt_attachment_failed");

  return { imageAssetId, localUri: receipt.uri };
}
