import type { Prisma } from '../../generated/prisma/client';
import {
  attachImageAsset,
  ImageAssetNotAttachableError,
} from '../../uploads/image-asset-attachments';
import { BackOfficeError, type BackOfficeActor } from '../back-office-errors';

// Finding 112: every Salary Payment carries the photo of its transfer, so
// recording, approving, or correcting one without it is refused.
export const requireSalaryReceipt = (
  receiptImageAssetId: string | undefined,
): string => {
  if (receiptImageAssetId === undefined) {
    throw new BackOfficeError('salary_receipt_required');
  }
  return receiptImageAssetId;
};

// BKO-008: the photo must be hers and ready; attaching takes it out of the
// abandoned-upload sweep.
export const attachSalaryReceipt = async (
  transaction: Prisma.TransactionClient,
  actor: BackOfficeActor,
  imageAssetId: string,
  now: Date,
) => {
  try {
    await attachImageAsset(transaction, {
      imageAssetId,
      ownerAccountId: actor.accountId,
      purpose: 'transfer_receipt',
      now,
    });
  } catch (error) {
    if (error instanceof ImageAssetNotAttachableError) {
      throw new BackOfficeError('salary_receipt_not_ready');
    }
    throw error;
  }
};
