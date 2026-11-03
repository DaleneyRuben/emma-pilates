import type { Prisma } from '../../generated/prisma/client';
import type { AcquisitionChannel as PrismaAcquisitionChannel } from '../../generated/prisma/enums';
import {
  attributeClient,
  normalizeReferralCode,
  type AcquisitionChannel,
  type ClientAttribution,
  type ReferralCodeHolder,
} from './acquisition';
import { AcquisitionError } from './acquisition-errors';

export const toPrismaChannel = (
  channel: AcquisitionChannel,
): PrismaAcquisitionChannel =>
  channel.toUpperCase() as PrismaAcquisitionChannel;

export const fromPrismaChannel = (
  channel: PrismaAcquisitionChannel,
): AcquisitionChannel => channel.toLowerCase() as AcquisitionChannel;

// BKM-017: the live holder of a code in the registry, a live Client or a live
// Trainer. A retired code holds nobody, whatever its text.
export const findReferralCodeHolder = async (
  transaction: Prisma.TransactionClient,
  code: string,
): Promise<ReferralCodeHolder | null> => {
  const row = await transaction.referralCode.findFirst({
    where: {
      code,
      retiredAt: null,
      OR: [
        { client: { deletedAt: null } },
        { staffMember: { role: 'TRAINER', deletedAt: null } },
      ],
    },
    select: { clientId: true, staffMemberId: true },
  });
  if (row?.clientId != null) return { kind: 'client', clientId: row.clientId };
  if (row?.staffMemberId != null) {
    return { kind: 'trainer', staffMemberId: row.staffMemberId };
  }
  return null;
};

// Resolves the typed code and works out the attribution; an unknown code or
// her own refuses the whole command.
export const resolveClientAttribution = async (
  transaction: Prisma.TransactionClient,
  input: {
    clientId: string;
    declaredChannel: AcquisitionChannel;
    referralCode: string | null | undefined;
  },
): Promise<{
  attribution: ClientAttribution;
  holder: ReferralCodeHolder | null;
}> => {
  const referralCode = normalizeReferralCode(input.referralCode);
  const holder =
    referralCode === null
      ? null
      : await findReferralCodeHolder(transaction, referralCode);
  if (referralCode !== null && holder === null) {
    throw new AcquisitionError('referral_code_invalid');
  }
  if (holder?.kind === 'client' && holder.clientId === input.clientId) {
    throw new AcquisitionError('referral_self_reference');
  }
  return {
    attribution: attributeClient({
      declaredChannel: input.declaredChannel,
      referralCode,
      holder,
    }),
    holder,
  };
};

export const attributionData = (attribution: ClientAttribution) => ({
  declaredChannel: toPrismaChannel(attribution.declaredChannel),
  channel: toPrismaChannel(attribution.channel),
  referralCode: attribution.referralCode,
  referrerClientId: attribution.referrerClientId,
  referrerStaffMemberId: attribution.referrerStaffMemberId,
});

// BKM-011: a new Client's attribution, written in the transaction that
// creates her (self-registration or the Assistant's invitation).
export const recordClientAcquisition = async (
  transaction: Prisma.TransactionClient,
  input: {
    clientId: string;
    declaredChannel: AcquisitionChannel;
    referralCode: string | null | undefined;
  },
): Promise<ReferralCodeHolder | null> => {
  const { attribution, holder } = await resolveClientAttribution(
    transaction,
    input,
  );
  await transaction.clientAcquisition.create({
    data: { clientId: input.clientId, ...attributionData(attribution) },
  });
  return holder;
};
