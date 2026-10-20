import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';

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

// BE-023 (ADR-0098): a live Client's own agreement to promotions, given or
// withdrawn from Perfil. Giving an open consent again keeps its first time.
const requireClient = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  return principal.identity.clientId;
};

const viewOf = (consentedAt: Date | null): PromotionsConsentView => ({
  consented: consentedAt !== null,
  consentedAt,
});

export const readPromotionsConsent = async (
  principal: AuthenticatedPrincipal,
  { store }: Dependencies,
): Promise<PromotionsConsentView> =>
  viewOf(await store.findOpen(requireClient(principal)));

export const setPromotionsConsent = async (
  command: { consented: boolean },
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<PromotionsConsentView> => {
  const input = { clientId: requireClient(principal), occurredAt: now() };
  if (command.consented) return viewOf(await store.give(input));
  await store.withdraw(input);
  return viewOf(null);
};
