import { Controller } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { PromotionsConsentView } from './promotions-consent';

export const promotionsConsentOperations = Symbol(
  'promotionsConsentOperations',
);

export type PromotionsConsentOperations = {
  read: (principal: AuthenticatedPrincipal) => Promise<PromotionsConsentView>;
  set: (
    command: { consented: boolean },
    principal: AuthenticatedPrincipal,
  ) => Promise<PromotionsConsentView>;
};

@Controller({ path: 'clients/current/promotions-consent', version: '1' })
export class PromotionsConsentController {}
