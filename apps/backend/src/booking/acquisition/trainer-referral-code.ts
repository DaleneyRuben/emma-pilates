import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

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

export const readTrainerReferralCode: (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<TrainerReferralCodeView> = () =>
  Promise.reject(new Error('pending'));

export const setTrainerReferralCode: (
  command: { staffMemberId: string; referralCode: string | null },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<TrainerReferralCodeView> = () =>
  Promise.reject(new Error('pending'));
