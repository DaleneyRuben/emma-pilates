import {
  createPendingUpload,
  finalizeUpload,
  getPutPendingUploadObjectUrl,
  getUploadStatus,
  type CreatePendingUploadDtoPurpose,
} from "@pilates/api-contracts";
import { decodeBase64, encodeBase64 } from "@pilates/mobile-core";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

// The Staff app's upload protocol (UPL-001), shared by the transfer receipt
// and the profile photo: pick, re-encode, then declare, put, finalize, and
// poll until the worker has rebuilt the image (ADR-0072, ADR-0073). These
// modules are native, so screens reach this file only through
// `load-image-upload` (PAY-006).
export type PickedImage = { uri: string; bytes: Uint8Array<ArrayBuffer> };

const pollMilliseconds = 700;
const pollAttempts = 40;
// UPL-003: nothing beyond the studio's 2048 px readable size is worth sending.
const uploadMaxEdge = 2048;
const uploadJpegQuality = 0.8;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Picks one image, from the camera when asked and allowed, otherwise from the
 * system photo library (which asks no permission, MOB-065), re-encoded once
 * as a JPEG at most 2048 px on its longest side. Cancelled returns null.
 */
export async function pickImage({ camera = false } = {}): Promise<PickedImage | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  const useCamera = camera && (await ImagePicker.requestCameraPermissionsAsync()).granted;
  const result = useCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;

  const converted = await ImageManipulator.manipulateAsync(asset.uri, downscaleActions(asset), {
    compress: uploadJpegQuality,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const base64 = await FileSystem.readAsStringAsync(converted.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri: converted.uri, bytes: decodeBase64(base64) };
}

function downscaleActions({ width = 0, height = 0 }: { width?: number; height?: number }) {
  if (Math.max(width, height) <= uploadMaxEdge) return [];
  return width >= height
    ? [{ resize: { width: uploadMaxEdge } }]
    : [{ resize: { height: uploadMaxEdge } }];
}

/** Uploads the JPEG and resolves with its asset id once it is READY. */
export async function uploadImage(
  image: PickedImage,
  purpose: CreatePendingUploadDtoPurpose,
  fetcher: typeof globalThis.fetch,
): Promise<string> {
  const { bytes } = image;
  // expo-crypto's native digest only accepts typed arrays, never a bare buffer.
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const declared = await createPendingUpload(
    {
      purpose,
      mediaType: "image/jpeg",
      byteSize: bytes.byteLength,
      checksum: encodeBase64(new Uint8Array(digest)),
    },
    undefined,
    fetcher,
  );
  if (declared.status !== 201) throw new Error("upload_declaration_failed");
  const imageAssetId = declared.data.id;

  const stored = await fetcher(getPutPendingUploadObjectUrl(imageAssetId), {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  if (!stored.ok) throw new Error("upload_failed");

  const finalized = await finalizeUpload(
    imageAssetId,
    { headers: { "idempotency-key": Crypto.randomUUID() } },
    fetcher,
  );
  if (finalized.status !== 202) throw new Error("upload_finalization_failed");

  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const status = await getUploadStatus(imageAssetId, undefined, fetcher);
    if (status.status === 200 && status.data.state === "ready") return imageAssetId;
    if (status.status === 200 && status.data.state === "failed") {
      throw new Error("upload_rejected");
    }
    await wait(pollMilliseconds);
  }
  throw new Error("upload_verification_timeout");
}
