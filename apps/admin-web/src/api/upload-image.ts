import {
  createPendingUpload,
  finalizeUpload,
  getPutPendingUploadObjectUrl,
  getUploadStatus,
  type CreatePendingUploadDtoMediaType,
  type CreatePendingUploadDtoPurpose,
} from "@pilates/api-contracts";
import { isApiError } from "./problem";

/**
 * Test 32's three calls from a browser: declare the bytes with their SHA-256,
 * PUT them, finalize with an Idempotency-Key (ADR-0060), then poll until the
 * worker has rebuilt the image (ADR-0073) or refused it. It mirrors the
 * Client app's `receipt-upload.ts`, which reads files and hashes through
 * Expo; the call order is the only shared part, so each app keeps its own.
 */
export type ImagePurpose = CreatePendingUploadDtoPurpose;

export type UploadFailureCode =
  | "image_media_type_invalid"
  | "image_too_large"
  | "image_dimensions_too_small"
  | "image_animated_not_allowed"
  | "upload_failed"
  | "upload_rejected"
  | "upload_verification_timeout";

export class UploadFailure extends Error {
  readonly code: UploadFailureCode;

  constructor(code: UploadFailureCode) {
    super(code);
    this.name = "UploadFailure";
    this.code = code;
  }
}

const acceptedMediaTypes: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ADR-0072 per purpose, and UPL-002's minimum for a Promotion image.
const limits: Record<
  ImagePurpose,
  { maxBytes: number; minWidth: number; minHeight: number }
> = {
  transfer_receipt: { maxBytes: 10 * 1024 * 1024, minWidth: 0, minHeight: 0 },
  profile_photo: { maxBytes: 5 * 1024 * 1024, minWidth: 0, minHeight: 0 },
  promotion: { maxBytes: 20 * 1024 * 1024, minWidth: 1200, minHeight: 675 },
};

/** What the backend would refuse, checked before any call is made. */
export function checkImage(
  purpose: ImagePurpose,
  image: {
    mediaType: string;
    byteSize: number;
    width: number;
    height: number;
  },
): UploadFailureCode | null {
  const limit = limits[purpose];
  if (!acceptedMediaTypes.includes(image.mediaType)) {
    return "image_media_type_invalid";
  }
  if (image.byteSize > limit.maxBytes) return "image_too_large";
  if (image.width < limit.minWidth || image.height < limit.minHeight) {
    return "image_dimensions_too_small";
  }
  return null;
}

/** The decoded size of an image the browser can show from `url`. */
export const readImageDimensions = (
  url: string,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new UploadFailure("image_media_type_invalid"));
    image.src = url;
  });

const messages: Record<UploadFailureCode, string> = {
  image_media_type_invalid: "Elige un archivo JPG, PNG o WEBP.",
  image_too_large: "La imagen pesa más de 20 MB.",
  image_dimensions_too_small:
    "La imagen debe medir al menos 1200 × 675 píxeles.",
  image_animated_not_allowed: "La imagen no puede ser animada.",
  upload_failed: "No pudimos subir la imagen. Inténtalo de nuevo.",
  // The status route names no reason yet, so a failed upload can only
  // restate what the worker checks (UPL-002).
  upload_rejected:
    "No pudimos procesar la imagen. Revisa que sea un JPG, PNG o WEBP de al menos 1200 × 675 píxeles y que no esté animada.",
  upload_verification_timeout:
    "La imagen está tardando en procesarse. Espera un momento e inténtalo de nuevo.",
};

const isFailureCode = (code: string): code is UploadFailureCode =>
  code in messages;

export function uploadFailureMessage(error: unknown): string {
  if (error instanceof UploadFailure) return messages[error.code];
  if (isApiError(error) && isFailureCode(error.code)) {
    return messages[error.code];
  }
  return messages.upload_failed;
}

const base64 = (bytes: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));

const pollMilliseconds = 700;
const pollAttempts = 40;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function uploadImage(
  file: File,
  purpose: ImagePurpose,
  fetcher: typeof globalThis.fetch,
  options: { sleep?: (milliseconds: number) => Promise<void> } = {},
): Promise<string> {
  const sleep = options.sleep ?? wait;
  const bytes = await file.arrayBuffer();
  const declared = await createPendingUpload(
    {
      purpose,
      mediaType: file.type as CreatePendingUploadDtoMediaType,
      byteSize: bytes.byteLength,
      checksum: base64(await crypto.subtle.digest("SHA-256", bytes)),
    },
    undefined,
    fetcher,
  );
  const imageAssetId = declared.data.id;

  await fetcher(getPutPendingUploadObjectUrl(imageAssetId), {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: bytes,
  });
  await finalizeUpload(
    imageAssetId,
    { headers: { "Idempotency-Key": crypto.randomUUID() } },
    fetcher,
  );

  for (let attempt = 1; attempt <= pollAttempts; attempt += 1) {
    const status = (await getUploadStatus(imageAssetId, undefined, fetcher))
      .data;
    if (status.state === "ready") return imageAssetId;
    if (status.state === "failed" || status.state === "deleted") {
      throw new UploadFailure("upload_rejected");
    }
    if (attempt < pollAttempts) await sleep(pollMilliseconds);
  }
  throw new UploadFailure("upload_verification_timeout");
}
