import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  AdministrationError,
  requireAdministrator,
  type AdministratorActor,
} from '../administration/administration-errors';

// BE-022: the Promotion Contacts ADR-0097 keeps for former Clients who agreed
// to promotions, for Administrators only (their personal data, ADR-0054).
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

export const listPromotionContacts = async (
  command: { page: number; pageSize: number; query?: string },
  principal: AuthenticatedPrincipal,
  { store }: Dependencies,
): Promise<PromotionContactPage> => {
  requireAdministrator(principal);
  const query = command.query?.trim() ?? '';
  return store.list({
    page: command.page,
    pageSize: command.pageSize,
    ...(query === '' ? {} : { query }),
  });
};

// Exporting hands personal data out of the system, so it is audited.
export const exportPromotionContacts = async (
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<PromotionContactRow[]> => {
  const actor = requireAdministrator(principal);
  const contacts = await store.listAll();
  await store.recordExport({
    actor,
    contactCount: contacts.length,
    occurredAt: now(),
  });
  return contacts;
};

// A «stop» request: the privacy page promises «borramos tu contacto», so the
// store erases the name, email, and phone while the row stays (ADR-0086).
export const withdrawPromotionContact = async (
  command: { contactId: string },
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<void> => {
  const actor = requireAdministrator(principal);
  const withdrawn = await store.withdraw({
    contactId: command.contactId,
    actor,
    occurredAt: now(),
  });
  if (!withdrawn) throw new AdministrationError('promotion_contact_not_found');
};
