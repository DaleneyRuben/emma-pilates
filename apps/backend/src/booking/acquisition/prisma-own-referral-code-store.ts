import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client';
import { AuditActorKind, AuditOutcome } from '../../generated/prisma/enums';
import type { ReferralCodeHolder } from './acquisition';
import { AcquisitionError } from './acquisition-errors';
import type { OwnReferralCodeStore } from './own-referral-code';
import {
  isReferralCodeBlocked,
  isReferralCodeTaken,
} from './referral-code-claim';

const holderWhere = (holder: ReferralCodeHolder) =>
  holder.kind === 'client'
    ? { clientId: holder.clientId }
    : { staffMemberId: holder.staffMemberId };

// BKM-017: a Client's or a Trainer's own code. The registry's triggers retire
// the previous code when the column changes.
export const createPrismaOwnReferralCodeStore = (
  prisma: PrismaClient,
): OwnReferralCodeStore => ({
  find: async (holder) => {
    const select = { referralCode: true, referralCodeChangedAt: true };
    const row =
      holder.kind === 'client'
        ? await prisma.client.findFirst({
            where: { id: holder.clientId, deletedAt: null },
            select,
          })
        : await prisma.staffMember.findFirst({
            where: { id: holder.staffMemberId, deletedAt: null },
            select,
          });
    return row === null
      ? null
      : {
          referralCode: row.referralCode,
          changedAt: row.referralCodeChangedAt,
        };
  },

  status: async (code, holder) => {
    if (await isReferralCodeBlocked(prisma, code)) return 'blocked';
    const owner = await prisma.referralCode.findUnique({
      where: { code },
      select: { clientId: true, staffMemberId: true },
    });
    if (owner === null) return 'available';
    const own = holderWhere(holder);
    const mine =
      'clientId' in own
        ? owner.clientId === own.clientId
        : owner.staffMemberId === own.staffMemberId;
    return mine ? 'available' : 'in_use';
  },

  change: async (input) => {
    const data = {
      referralCode: input.referralCode,
      referralCodeChangedAt: input.occurredAt,
    };
    try {
      await prisma.$transaction(async (transaction) => {
        const target =
          input.holder.kind === 'client'
            ? await transaction.client
                .update({ where: { id: input.holder.clientId }, data })
                .then(({ id }) => ({ type: 'client', id }))
            : await transaction.staffMember
                .update({ where: { id: input.holder.staffMemberId }, data })
                .then(({ id }) => ({ type: 'staff_member', id }));
        await transaction.auditRecord.create({
          data: {
            actionCode:
              target.type === 'client'
                ? 'client.referral_code_changed'
                : 'staff_member.referral_code_changed',
            outcome: AuditOutcome.SUCCEEDED,
            actorKind: AuditActorKind.ACCOUNT,
            actorAccountId: input.actorAccountId,
            actorRole: target.type === 'client' ? null : 'TRAINER',
            targetType: target.type,
            targetId: target.id,
            correlationId: randomUUID(),
            metadata: {
              previousReferralCode: input.previousReferralCode,
              referralCode: input.referralCode,
            },
            occurredAt: input.occurredAt,
          },
        });
      });
    } catch (error) {
      if (isReferralCodeTaken(error)) {
        throw new AcquisitionError('referral_code_in_use');
      }
      throw error;
    }
  },
});
