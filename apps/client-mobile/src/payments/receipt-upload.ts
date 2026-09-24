import { attachPurchaseIntentReceipt } from "@pilates/api-contracts";

import {
  idempotency,
  pickImage,
  uploadImage,
  type PickedImage,
} from "../uploads/image-upload";

export type PickedReceipt = PickedImage;

export type AttachedReceipt = { imageAssetId: string; localUri: string };

export const pickReceipt = pickImage;

// Runs the shared upload protocol for a transfer receipt, then attaches the
// READY asset to the open Purchase Intent.
export async function uploadReceipt(
  receipt: PickedReceipt,
  purchaseIntentId: string,
  fetcher: typeof globalThis.fetch,
  sleep?: (milliseconds: number) => Promise<void>,
): Promise<AttachedReceipt> {
  const imageAssetId = await uploadImage(
    receipt,
    "transfer_receipt",
    fetcher,
    sleep,
  );

  const attached = await attachPurchaseIntentReceipt(
    purchaseIntentId,
    { imageAssetId },
    idempotency(),
    fetcher,
  );
  if (attached.status !== 200) throw new Error("receipt_attachment_failed");

  return { imageAssetId, localUri: receipt.uri };
}
