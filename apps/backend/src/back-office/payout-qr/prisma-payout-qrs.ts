import { randomUUID } from 'node:crypto';
import { retrySerializable } from '../../database/retry-serializable';
import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import { AuditActorKind, AuditOutcome } from '../../generated/prisma/enums';
import {
  attachImageAsset,
  detachImageAsset,
} from '../../uploads/image-asset-attachments';
import {
  receiptObject,
  receiptObjectSelect,
} from '../../uploads/private-image-object';
import { civilText } from '../prisma-audit';
import type { PayoutQrGateway } from './payout-qrs';

type Transaction = Prisma.TransactionClient;
const serializable = { isolationLevel: 'Serializable' } as const;
const current = { replacedAt: null } as const;

// Two first uploads both see no current QR; the partial unique index refuses
// the second, and a fresh snapshot then replaces the first (BKM-017's retry).
const isCurrentQrTaken = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

// FIX-072: `back_office.staff_payout_qrs` over the uploads-owned attach and
// detach slice (ADR-0076). A new QR ends the current one (`replaced_at`) and
// releases its photo; the row stays as history (ADR-0086). Audited on the
// person's Account as `staff_member.payout_qr_changed`.
export const createPrismaPayoutQrs = (
  prisma: PrismaClient,
): PayoutQrGateway => {
  const findCurrent = (database: Transaction | PrismaClient, id: string) =>
    database.staffPayoutQr.findFirst({
      where: { staffMemberId: id, ...current },
      select: { id: true, validUntil: true, imageAssetId: true },
    });

  return {
    findCurrent: async (staffMemberId) => {
      const qr = await findCurrent(prisma, staffMemberId);
      return qr === null ? null : { id: qr.id, validUntil: qr.validUntil };
    },

    replace: (input) =>
      retrySerializable(
        () =>
          prisma.$transaction(async (transaction: Transaction) => {
            await attachImageAsset(transaction, {
              imageAssetId: input.imageAssetId,
              ownerAccountId: input.accountId,
              purpose: 'payout_qr',
              now: input.now,
            });
            const previous = await findCurrent(
              transaction,
              input.staffMemberId,
            );
            if (previous !== null) {
              await transaction.staffPayoutQr.update({
                where: { id: previous.id },
                data: { replacedAt: input.now },
              });
              await detachImageAsset(transaction, {
                imageAssetId: previous.imageAssetId,
                now: input.now,
              });
            }
            const qr = await transaction.staffPayoutQr.create({
              data: {
                staffMemberId: input.staffMemberId,
                imageAssetId: input.imageAssetId,
                validUntil: input.validUntil,
                uploadedByAccountId: input.accountId,
                createdAt: input.now,
              },
              select: { id: true, validUntil: true },
            });
            await transaction.auditRecord.create({
              data: {
                actionCode: 'staff_member.payout_qr_changed',
                outcome: AuditOutcome.SUCCEEDED,
                actorKind: AuditActorKind.ACCOUNT,
                actorAccountId: input.actor.accountId,
                actorRole: input.actor.role,
                impersonationId: input.actor.impersonationId,
                targetType: 'account',
                targetId: input.accountId,
                correlationId: randomUUID(),
                metadata: {
                  payoutQrId: qr.id,
                  validUntil: civilText(qr.validUntil),
                  replaced: previous !== null,
                },
                occurredAt: input.now,
              },
            });
            return qr;
          }, serializable),
        { retryAlso: isCurrentQrTaken },
      ),

    readImage: async (input) => {
      const qr = await prisma.staffPayoutQr.findFirst({
        where: {
          id: input.payoutQrId,
          ...current,
          ...(input.staffMemberId === null
            ? {}
            : { staffMemberId: input.staffMemberId }),
        },
        select: {
          validUntil: true,
          imageAsset: { select: receiptObjectSelect(input.variant) },
        },
      });
      const image = receiptObject(qr?.imageAsset);
      return qr === null || image === null
        ? null
        : { ...image, validUntil: qr.validUntil };
    },
  };
};
