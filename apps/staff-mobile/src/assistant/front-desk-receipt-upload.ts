import { pickImage, uploadImage } from "../uploads/image-upload";
import type { FrontDeskReceipt, ReceiptSource } from "./front-desk-receipt-card";

/**
 * Photographs the Client's receipt, or picks it from the gallery, and uploads
 * it until READY. Cancelled returns null. The caller submits the pending
 * transfer.
 */
export async function chooseTransferReceipt(
  fetcher: typeof globalThis.fetch,
  source: ReceiptSource,
): Promise<FrontDeskReceipt | null> {
  const picked = await pickImage({ camera: source === "camera" });
  if (picked === null) return null;
  return { imageAssetId: await uploadImage(picked, "transfer_receipt", fetcher) };
}
