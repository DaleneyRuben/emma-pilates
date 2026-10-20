import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

export type PromotionsConsentView = {
  consented: boolean;
  consentedAt: Date | null;
};

export interface PromotionsConsentStore {
  findOpen: (clientId: string) => Promise<Date | null>;
  give: (input: { clientId: string; occurredAt: Date }) => Promise<Date>;
  withdraw: (input: { clientId: string; occurredAt: Date }) => Promise<void>;
}

type Dependencies = { store: PromotionsConsentStore; now: () => Date };

const notBuilt = (...input: unknown[]): Promise<never> =>
  Promise.reject(new Error(`not built: ${input.length}`));

export const readPromotionsConsent: (
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<PromotionsConsentView> = notBuilt;

export const setPromotionsConsent: (
  command: { consented: boolean },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<PromotionsConsentView> = notBuilt;
