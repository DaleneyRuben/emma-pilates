import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  type StaffRole,
} from '../../generated/prisma/enums';
import { AcquisitionError } from './acquisition-errors';
import type {
  ClientAcquisitionStore,
  ClientAcquisitionView,
} from './client-acquisition';
import {
  attributionData,
  fromPrismaChannel,
  resolveClientAttribution,
} from './record-client-acquisition';
import type { TrainerReferralCodeStore } from './trainer-referral-code';

type Reader = Prisma.TransactionClient | PrismaClient;

const readView = async (
  prisma: Reader,
  clientId: string,
): Promise<ClientAcquisitionView | null> => {
  const client = await prisma.client.findFirst({
    where: { id: clientId, deletedAt: null },
    select: {
      id: true,
      acquisitions: {
        where: { deletedAt: null },
        select: {
          declaredChannel: true,
          channel: true,
          referralCode: true,
          referrerClient: { select: { id: true, name: true } },
          referrerStaffMember: { select: { id: true, name: true } },
        },
        take: 1,
      },
    },
  });
  if (client === null) return null;
  const row = client.acquisitions[0];
  if (row === undefined) {
    return {
      clientId,
      declaredChannel: 'unknown',
      channel: 'unknown',
      referralCode: null,
      referrer: null,
    };
  }
  const referrer =
    row.referrerStaffMember !== null
      ? { kind: 'trainer' as const, ...row.referrerStaffMember }
      : row.referrerClient !== null
        ? { kind: 'client' as const, ...row.referrerClient }
        : null;
  return {
    clientId,
    declaredChannel: fromPrismaChannel(row.declaredChannel),
    channel: fromPrismaChannel(row.channel),
    referralCode: row.referralCode,
    referrer,
  };
};

const audit = (
  transaction: Prisma.TransactionClient,
  record: {
    actionCode:
      'client_acquisition.corrected' | 'staff_member.referral_code_changed';
    actorAccountId: string;
    actorRole: StaffRole;
    targetType: 'client' | 'staff_member';
    targetId: string;
    metadata: Prisma.InputJsonObject;
    occurredAt: Date;
  },
) =>
  transaction.auditRecord.create({
    data: {
      ...record,
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      correlationId: randomUUID(),
    },
  });

// BKM-011: the Client detail's «¿Cómo nos conociste?» block.
export const createPrismaClientAcquisitionStore = (
  prisma: PrismaClient,
): ClientAcquisitionStore => ({
  read: (clientId) => readView(prisma, clientId),

  correct: (input) =>
    prisma.$transaction(async (transaction) => {
      const previous = await readView(transaction, input.clientId);
      if (previous === null) return null;
      const { attribution } = await resolveClientAttribution(transaction, {
        clientId: input.clientId,
        declaredChannel: input.declaredChannel,
        referralCode: input.referralCode,
      });
      const data = attributionData(attribution);
      const current = await transaction.clientAcquisition.findFirst({
        where: { clientId: input.clientId, deletedAt: null },
        select: { id: true },
      });
      await (current === null
        ? transaction.clientAcquisition.create({
            data: { clientId: input.clientId, ...data },
          })
        : transaction.clientAcquisition.update({
            where: { id: current.id },
            data,
          }));
      await audit(transaction, {
        actionCode: 'client_acquisition.corrected',
        actorAccountId: input.actor.accountId,
        actorRole: input.actor.role.toUpperCase() as StaffRole,
        targetType: 'client',
        targetId: input.clientId,
        metadata: {
          previousChannel: previous.channel,
          channel: attribution.channel,
          previousReferralCode: previous.referralCode,
          referralCode: attribution.referralCode,
        },
        occurredAt: input.occurredAt,
      });
      return readView(transaction, input.clientId);
    }),
});

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

// BKM-011: a Trainer's personal code. Client codes are unique on their own
// column; a live Trainer's through a partial index, and the check below
// keeps the two apart.
export const createPrismaTrainerReferralCodeStore = (
  prisma: PrismaClient,
): TrainerReferralCodeStore => ({
  find: async (staffMemberId) => {
    const member = await prisma.staffMember.findFirst({
      where: { id: staffMemberId, deletedAt: null },
      select: { id: true, role: true, referralCode: true },
    });
    return member === null
      ? null
      : {
          staffMemberId: member.id,
          role: member.role.toLowerCase(),
          referralCode: member.referralCode,
        };
  },

  set: async (input) => {
    try {
      return await prisma.$transaction(async (transaction) => {
        if (input.referralCode !== null) {
          const [clients, trainers] = await Promise.all([
            transaction.client.count({
              where: { referralCode: input.referralCode },
            }),
            transaction.staffMember.count({
              where: {
                referralCode: input.referralCode,
                deletedAt: null,
                id: { not: input.staffMemberId },
              },
            }),
          ]);
          if (clients + trainers > 0) {
            throw new AcquisitionError('referral_code_in_use');
          }
        }
        await transaction.staffMember.update({
          where: { id: input.staffMemberId },
          data: { referralCode: input.referralCode },
        });
        await audit(transaction, {
          actionCode: 'staff_member.referral_code_changed',
          actorAccountId: input.actorAccountId,
          actorRole: 'ADMINISTRATOR',
          targetType: 'staff_member',
          targetId: input.staffMemberId,
          metadata: {
            previousReferralCode: input.previousReferralCode,
            referralCode: input.referralCode,
          },
          occurredAt: input.occurredAt,
        });
        return {
          staffMemberId: input.staffMemberId,
          referralCode: input.referralCode,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AcquisitionError('referral_code_in_use');
      }
      throw error;
    }
  },
});
