import { pickImage, uploadImage } from "../uploads/image-upload";
import type { FrontDeskReceipt } from "./front-desk-receipt-card";

/**
 * Photographs or picks the Client's receipt and uploads it until READY.
 * Cancelled returns null. The caller submits the pending transfer.
 */
export async function photographTransferReceipt(
  fetcher: typeof globalThis.fetch,
): Promise<FrontDeskReceipt | null> {
  const picked = await pickImage({ camera: true });
  if (picked === null) return null;
  return { imageAssetId: await uploadImage(picked, "transfer_receipt", fetcher) };
}
