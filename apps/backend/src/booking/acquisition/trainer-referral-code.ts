import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { parseTrainerReferralCode } from './acquisition';
import { AcquisitionError } from './acquisition-errors';

export type TrainerReferralCodeView = {
  staffMemberId: string;
  referralCode: string | null;
};

export interface TrainerReferralCodeStore {
  /** The live Staff Member, whatever her Role. */
  find: (staffMemberId: string) => Promise<{
    staffMemberId: string;
    role: string;
    referralCode: string | null;
  } | null>;
  /** Writes the code and its audit record; refuses a code already held. */
  set: (input: {
    staffMemberId: string;
    referralCode: string | null;
    previousReferralCode: string | null;
    actorAccountId: string;
    occurredAt: Date;
  }) => Promise<TrainerReferralCodeView>;
}

type Dependencies = { store: TrainerReferralCodeStore; now: () => Date };

// BKM-011: the Administrator creates a Trainer's personal code; pay
// (BKO-006) depends on it, so no other Role touches it.
const requireAdministrator = (principal: AuthenticatedPrincipal): string => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new AcquisitionError('acquisition_access_denied');
  }
  return principal.accountId;
};

const findMember = async (store: TrainerReferralCodeStore, id: string) => {
  const member = await store.find(id);
  if (member === null) throw new AcquisitionError('staff_member_not_found');
  return member;
};

export const readTrainerReferralCode = async (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  { store }: Dependencies,
): Promise<TrainerReferralCodeView> => {
  requireAdministrator(principal);
  const member = await findMember(store, command.staffMemberId);
  return {
    staffMemberId: member.staffMemberId,
    referralCode: member.referralCode,
  };
};

/** `null` removes the code; a Client registered with it keeps her Trainer. */
export const setTrainerReferralCode = async (
  command: { staffMemberId: string; referralCode: string | null },
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<TrainerReferralCodeView> => {
  const actorAccountId = requireAdministrator(principal);
  const referralCode =
    command.referralCode === null
      ? null
      : parseTrainerReferralCode(command.referralCode);
  if (command.referralCode !== null && referralCode === null) {
    throw new AcquisitionError('referral_code_malformed');
  }
  const member = await findMember(store, command.staffMemberId);
  if (referralCode !== null && member.role !== 'trainer') {
    throw new AcquisitionError('staff_member_not_trainer');
  }
  return store.set({
    staffMemberId: member.staffMemberId,
    referralCode,
    previousReferralCode: member.referralCode,
    actorAccountId,
    occurredAt: now(),
  });
};
