import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  AdministrationError,
  requireOperations,
  type AdministratorActor,
} from '../administration/administration-errors';

// BE-022: the Promotion Contacts ADR-0097 keeps for former Clients who agreed
// to promotions and, since FIX-060 (walkthrough finding 85, the owner's
// decision), every live Client whether or not she agreed, for the
// Administrator and the Coordinator (their personal data, ADR-0054; ADR-0108).
export type PromotionContactKind = 'client' | 'former_client';

export type PromotionContactRow = {
  // The Promotion Contact's id, or the live Client's.
  id: string;
  kind: PromotionContactKind;
  name: string;
  email: string;
  phone: string | null;
  // When a former Client agreed while closing, or when a live Client joined.
  since: Date;
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

// The store records who acted, not which Role let her.
const actorOf = (principal: AuthenticatedPrincipal): AdministratorActor => {
  const { accountId, staffMemberId, audit } = requireOperations(principal);
  return { accountId, staffMemberId, audit };
};

export const listPromotionContacts = async (
  command: { page: number; pageSize: number; query?: string },
  principal: AuthenticatedPrincipal,
  { store }: Dependencies,
): Promise<PromotionContactPage> => {
  requireOperations(principal);
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
  const actor = actorOf(principal);
  const contacts = await store.listAll();
  await store.recordExport({
    actor,
    contactCount: contacts.length,
    occurredAt: now(),
  });
  return contacts;
};

// A «stop» request for a former Client: the privacy page promises «borramos tu
// contacto», so the store erases the name, email, and phone while the row
// stays (ADR-0086). A live Client is not withdrawn: she stays listed.
export const withdrawPromotionContact = async (
  command: { contactId: string },
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<void> => {
  const actor = actorOf(principal);
  const withdrawn = await store.withdraw({
    contactId: command.contactId,
    actor,
    occurredAt: now(),
  });
  if (!withdrawn) throw new AdministrationError('promotion_contact_not_found');
};
