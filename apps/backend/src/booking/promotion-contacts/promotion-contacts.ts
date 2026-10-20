import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { AdministratorActor } from '../administration/administration-errors';

export type PromotionContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  consentedAt: Date;
};

export type PromotionContactPage = {
  items: PromotionContactRow[];
  page: number;
  pageSize: number;
  totalItems: number;
};

export interface PromotionContactStore {
  list: (input: {
    page: number;
    pageSize: number;
    query?: string;
  }) => Promise<PromotionContactPage>;
  listAll: () => Promise<PromotionContactRow[]>;
  recordExport: (input: {
    actor: AdministratorActor;
    contactCount: number;
    occurredAt: Date;
  }) => Promise<void>;
  withdraw: (input: {
    contactId: string;
    actor: AdministratorActor;
    occurredAt: Date;
  }) => Promise<boolean>;
}

type Dependencies = { store: PromotionContactStore; now: () => Date };

// Red stubs: BE-022 builds these next.
const notBuilt = (...input: unknown[]): Promise<never> =>
  Promise.reject(new Error(`not built (${input.length} arguments)`));

export const listPromotionContacts: (
  command: { page: number; pageSize: number; query?: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<PromotionContactPage> = notBuilt;

export const exportPromotionContacts: (
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<PromotionContactRow[]> = notBuilt;

export const withdrawPromotionContact: (
  command: { contactId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<void> = notBuilt;
