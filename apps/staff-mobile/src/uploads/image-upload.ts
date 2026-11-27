import {
  createPendingUpload,
  finalizeUpload,
  getPutPendingUploadObjectUrl,
  getUploadStatus,
  type CreatePendingUploadDtoPurpose,
} from "@pilates/api-contracts";
import {
  decodeBase64,
  encodeBase64,
  uploadMaxEdge,
  waitForUploadReady,
} from "@pilates/mobile-core";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

// The Staff app's upload protocol (UPL-001), shared by the transfer receipt
// and the profile photo: pick, re-encode, then declare, put, finalize, and
// poll until the worker has rebuilt the image (ADR-0072, ADR-0073). These
// modules are native, so screens reach this file only through
// `load-image-upload` (PAY-006).
// A photo is always re-encoded as a JPEG; FIX-049's invoice PDF keeps its
// type and the name she sees in her files.
export type PickedImage = {
  uri: string;
  bytes: Uint8Array<ArrayBuffer>;
  mediaType?: "image/jpeg" | "application/pdf";
  fileName?: string;
};

// UPL-003: nothing beyond the studio's 2048 px readable size is worth sending.
const uploadJpegQuality = 0.8;

/**
 * Picks one image, from the camera when asked and allowed, otherwise from the
 * system photo library (which asks no permission, MOB-065), re-encoded once
 * as a JPEG at most `maxEdge` px on its longest side: 2048, or 1024 for a
 * profile photo (walkthrough n.º 14). Cancelled returns null.
 */
export async function pickImage({
  camera = false,
  maxEdge = uploadMaxEdge,
} = {}): Promise<PickedImage | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  const useCamera = camera && (await ImagePicker.requestCameraPermissionsAsync()).granted;
  const result = useCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;

  const converted = await ImageManipulator.manipulateAsync(
    asset.uri,
    downscaleActions(asset, maxEdge),
    {
      compress: uploadJpegQuality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  const base64 = await FileSystem.readAsStringAsync(converted.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri: converted.uri, bytes: decodeBase64(base64) };
}

function downscaleActions(
  { width = 0, height = 0 }: { width?: number; height?: number },
  maxEdge: number,
) {
  if (Math.max(width, height) <= maxEdge) return [];
  return width >= height ? [{ resize: { width: maxEdge } }] : [{ resize: { height: maxEdge } }];
}

/**
 * How far an upload got, from 0 to 1, step by step: declared, sent, finalized,
 * ready (the Client's receipt, walkthrough n.º 7). React Native's fetch
 * reports no byte progress.
 */
export type UploadProgress = (fraction: number) => void;

/** Uploads the JPEG (or the invoice PDF) and resolves with its asset id once it is READY. */
export async function uploadImage(
  image: PickedImage,
  purpose: CreatePendingUploadDtoPurpose,
  fetcher: typeof globalThis.fetch,
  onProgress: UploadProgress = () => undefined,
): Promise<string> {
  const { bytes } = image;
  const mediaType = image.mediaType ?? "image/jpeg";
  // expo-crypto's native digest only accepts typed arrays, never a bare buffer.
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const declared = await createPendingUpload(
    {
      purpose,
      mediaType,
      byteSize: bytes.byteLength,
      checksum: encodeBase64(new Uint8Array(digest)),
    },
    undefined,
    fetcher,
  );
  if (declared.status !== 201) throw new Error("upload_declaration_failed");
  const imageAssetId = declared.data.id;
  onProgress(0.1);

  const stored = await fetcher(getPutPendingUploadObjectUrl(imageAssetId), {
    method: "PUT",
    headers: { "Content-Type": mediaType },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  if (!stored.ok) throw new Error("upload_failed");
  onProgress(0.7);

  const finalized = await finalizeUpload(
    imageAssetId,
    { headers: { "idempotency-key": Crypto.randomUUID() } },
    fetcher,
  );
  if (finalized.status !== 202) throw new Error("upload_finalization_failed");
  onProgress(0.8);

  await waitForUploadReady(async () => {
    const status = await getUploadStatus(imageAssetId, undefined, fetcher);
    return status.status === 200 ? status.data.state : null;
  });
  onProgress(1);
  return imageAssetId;
}
