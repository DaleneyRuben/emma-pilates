import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { ReferralCodeHolder } from './acquisition';

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
    actorAccountId: string;
    occurredAt: Date;
  }) => Promise<void>;
}

type Dependencies = { store: OwnReferralCodeStore; now: () => Date };

const notBuilt = () => Promise.reject(new Error('not built'));

export const readOwnReferralCode: (
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<OwnReferralCodeView> = notBuilt;

export const changeOwnReferralCode: (
  command: { referralCode: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<OwnReferralCodeView> = notBuilt;

export const checkReferralCodeAvailability: (
  command: { code: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<ReferralCodeAvailability> = notBuilt;
