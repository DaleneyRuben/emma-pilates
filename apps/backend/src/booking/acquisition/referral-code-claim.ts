import { Prisma } from '../../generated/prisma/client';

// BKM-017: the database builds a readable code from the name and reserves it
// for this transaction (booking.claim_readable_referral_code, in the
// readable_referral_codes migration), so the backfill and every new Client
// or Trainer follow the same rules.
export const claimReadableReferralCode = async (
  transaction: Prisma.TransactionClient,
  name: string,
): Promise<string> => {
  const [row] = await transaction.$queryRaw<[{ code: string }]>`
    SELECT "booking"."claim_readable_referral_code"(${name}) AS code`;
  return row.code;
};

// The owner's blocklist lives with the generator, in the database.
export const isReferralCodeBlocked = async (
  transaction: Prisma.TransactionClient,
  code: string,
): Promise<boolean> => {
  const [row] = await transaction.$queryRaw<[{ blocked: boolean }]>`
    SELECT "booking"."referral_code_blocked"(${code}) AS blocked`;
  return row.blocked;
};

/** A code someone holds or held: the registry's unique index refused it. */
export const isReferralCodeTaken = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
