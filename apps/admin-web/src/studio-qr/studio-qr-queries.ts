import {
  getGetStudioTransferQrQueryKey,
  getGetTransferQrImageUrl,
  getStudioTransferQr,
  getReplaceStudioTransferQrUrl,
  type StudioTransferQrDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { isApiError } from "../api/problem";

export const acceptedQrTypes = ["image/jpeg", "image/png", "image/webp"];
const maxQrBytes = 5 * 1024 * 1024;

export const studioQrStatusQueryOptions = () =>
  queryOptions({
    queryKey: getGetStudioTransferQrQueryKey(),
    queryFn: async ({ signal }) =>
      (await getStudioTransferQr({ signal }, adminFetch))
        .data as StudioTransferQrDto,
  });

const dataUrl = (bytes: Uint8Array, mediaType: string): string => {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return `data:${mediaType};base64,${btoa(binary)}`;
};

// The image the apps show, read with the session cookie from the same
// never-cached route as a data URL, so no object URL outlives the page and
// nothing keeps it once the page closes (ADR-0026).
export const studioQrImageQueryOptions = () =>
  queryOptions({
    queryKey: [getGetTransferQrImageUrl()],
    queryFn: async ({ signal }) => {
      const response = await adminFetch(getGetTransferQrImageUrl(), {
        signal,
      });
      return dataUrl(
        new Uint8Array(await response.arrayBuffer()),
        response.headers.get("content-type") ?? "image/png",
      );
    },
    gcTime: 0,
  });

export type QrUploadFailure =
  "transfer_qr_invalid_image" | "transfer_qr_too_large" | "upload_failed";

export class QrUploadError extends Error {
  readonly failure: QrUploadFailure;

  constructor(failure: QrUploadFailure) {
    super(failure);
    this.name = "QrUploadError";
    this.failure = failure;
  }
}

const messages: Record<QrUploadFailure, string> = {
  transfer_qr_invalid_image:
    "Ese archivo no es una imagen que podamos usar. Elige un JPG, PNG o WEBP.",
  transfer_qr_too_large:
    "La imagen es muy grande. Elige una de hasta 5 MB y 4096 píxeles por lado.",
  upload_failed: "No pudimos subir el QR. Inténtalo de nuevo.",
};

export function qrUploadMessage(error: unknown): string {
  if (error instanceof QrUploadError) return messages[error.failure];
  if (
    isApiError(error) &&
    (error.code === "transfer_qr_invalid_image" ||
      error.code === "transfer_qr_too_large")
  ) {
    return messages[error.code];
  }
  return messages.upload_failed;
}

// The raw bytes go up as the body; the answer carries the new date, and the
// image is read again so the page shows what the apps now show.
export function useStudioQrUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!acceptedQrTypes.includes(file.type)) {
        throw new QrUploadError("transfer_qr_invalid_image");
      }
      if (file.size > maxQrBytes) {
        throw new QrUploadError("transfer_qr_too_large");
      }
      // The bytes, not the File, like `uploadImage`: the body is the image.
      const response = await adminFetch(getReplaceStudioTransferQrUrl(), {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: await file.arrayBuffer(),
      });
      return (await response.json()) as StudioTransferQrDto;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(getGetStudioTransferQrQueryKey(), saved);
      await queryClient.invalidateQueries({
        queryKey: [getGetTransferQrImageUrl()],
      });
    },
  });
}
