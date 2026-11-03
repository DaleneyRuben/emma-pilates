import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  normalizeReferralCode,
  parseReferralCode,
  type ReferralCodeHolder,
} from './acquisition';
import { AcquisitionError } from './acquisition-errors';

export type OwnReferralCodeView = {
  referralCode: string | null;
  /** When she may change it again; `null`: now. */
  editableFrom: Date | null;
};

export type ReferralCodeStatus = 'available' | 'in_use' | 'blocked';

export type ReferralCodeAvailability = {
  code: string;
  status: ReferralCodeStatus | 'malformed' | 'current';
};

export interface OwnReferralCodeStore {
  find: (
    holder: ReferralCodeHolder,
  ) => Promise<{ referralCode: string | null; changedAt: Date | null } | null>;
  status: (
    code: string,
    holder: ReferralCodeHolder,
  ) => Promise<ReferralCodeStatus>;
  change: (input: {
    holder: ReferralCodeHolder;
    referralCode: string;
    previousReferralCode: string | null;
    /** The change she read before saving: a save that finds another one
     * since then is refused as too soon (two devices at once). */
    previousChangedAt: Date | null;
    actorAccountId: string;
    occurredAt: Date;
  }) => Promise<void>;
}

type Dependencies = { store: OwnReferralCodeStore; now: () => Date };

/** BKM-017 (owner 2026-11-02): one change of her own code every 30 days. */
export const referralCodeChangeIntervalDays = 30;

const editableFrom = (changedAt: Date | null): Date | null =>
  changedAt === null
    ? null
    : new Date(
        changedAt.getTime() + referralCodeChangeIntervalDays * 86_400_000,
      );

// A Client, or a Trainer: the two kinds of holder (Booking ADR-0009).
const holderOf = (principal: AuthenticatedPrincipal): ReferralCodeHolder => {
  const { identity } = principal;
  if (identity.kind === 'client') {
    return { kind: 'client', clientId: identity.clientId };
  }
  if (identity.kind === 'staff' && identity.role === 'trainer') {
    return { kind: 'trainer', staffMemberId: identity.staffMemberId };
  }
  throw new AcquisitionError('acquisition_access_denied');
};

const findCurrent = async (
  store: OwnReferralCodeStore,
  holder: ReferralCodeHolder,
) => {
  const current = await store.find(holder);
  if (current === null) throw new AcquisitionError('acquisition_access_denied');
  return current;
};

export const readOwnReferralCode = async (
  principal: AuthenticatedPrincipal,
  { store }: Dependencies,
): Promise<OwnReferralCodeView> => {
  const current = await findCurrent(store, holderOf(principal));
  return {
    referralCode: current.referralCode,
    editableFrom: editableFrom(current.changedAt),
  };
};

const refusals = {
  in_use: 'referral_code_in_use',
  blocked: 'referral_code_blocked',
} as const;

// The old code stops working; a Client registered with it keeps her
// attribution, which names the holder, not the code.
export const changeOwnReferralCode = async (
  command: { referralCode: string },
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<OwnReferralCodeView> => {
  const holder = holderOf(principal);
  const referralCode = parseReferralCode(command.referralCode);
  if (referralCode === null) {
    throw new AcquisitionError('referral_code_malformed');
  }
  const current = await findCurrent(store, holder);
  if (referralCode === current.referralCode) {
    return { referralCode, editableFrom: editableFrom(current.changedAt) };
  }
  const occurredAt = now();
  const from = editableFrom(current.changedAt);
  if (from !== null && from > occurredAt) {
    throw new AcquisitionError('referral_code_change_too_soon');
  }
  const status = await store.status(referralCode, holder);
  if (status !== 'available') throw new AcquisitionError(refusals[status]);
  await store.change({
    holder,
    referralCode,
    previousReferralCode: current.referralCode,
    previousChangedAt: current.changedAt,
    actorAccountId: principal.accountId,
    occurredAt,
  });
  return { referralCode, editableFrom: editableFrom(occurredAt) };
};

export const checkReferralCodeAvailability = async (
  command: { code: string },
  principal: AuthenticatedPrincipal,
  { store }: Dependencies,
): Promise<ReferralCodeAvailability> => {
  const holder = holderOf(principal);
  const code = normalizeReferralCode(command.code) ?? '';
  if (parseReferralCode(code) === null) return { code, status: 'malformed' };
  const current = await findCurrent(store, holder);
  if (code === current.referralCode) return { code, status: 'current' };
  return { code, status: await store.status(code, holder) };
};
