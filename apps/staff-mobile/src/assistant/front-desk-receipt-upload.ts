import {
  createPendingUpload,
  finalizeUpload,
  getPutPendingUploadObjectUrl,
  getUploadStatus,
} from "@pilates/api-contracts";
import { decodeBase64, encodeBase64 } from "@pilates/mobile-core";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import type { FrontDeskReceipt } from "./front-desk-receipt-card";

const pollMilliseconds = 700;
const pollAttempts = 40;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Photographs or picks the Client's receipt and uploads it until READY.
 * Cancelled returns null. The caller submits the pending transfer.
 */
export async function photographTransferReceipt(
  fetcher: typeof globalThis.fetch,
): Promise<FrontDeskReceipt | null> {
  const camera = await ImagePicker.requestCameraPermissionsAsync();
  const result = camera.granted
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;

  const converted = await ImageManipulator.manipulateAsync(asset.uri, [], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const base64 = await FileSystem.readAsStringAsync(converted.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = decodeBase64(base64);
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const declared = await createPendingUpload(
    {
      purpose: "transfer_receipt",
      mediaType: "image/jpeg",
      byteSize: bytes.byteLength,
      checksum: encodeBase64(new Uint8Array(digest)),
    },
    undefined,
    fetcher,
  );
  if (declared.status !== 201) throw new Error("upload_declaration_failed");

  const stored = await fetcher(getPutPendingUploadObjectUrl(declared.data.id), {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  if (!stored.ok) throw new Error("upload_failed");

  const finalized = await finalizeUpload(
    declared.data.id,
    { headers: { "idempotency-key": Crypto.randomUUID() } },
    fetcher,
  );
  if (finalized.status !== 202) throw new Error("upload_finalization_failed");

  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const status = await getUploadStatus(declared.data.id, undefined, fetcher);
    if (status.status === 200 && status.data.state === "ready") {
      return { imageAssetId: declared.data.id };
    }
    if (status.status === 200 && status.data.state === "failed") {
      throw new Error("upload_rejected");
    }
    await wait(pollMilliseconds);
  }
  throw new Error("upload_verification_timeout");
}
