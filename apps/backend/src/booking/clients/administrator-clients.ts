import type { ClientPhotoRef } from '../client/client-photo-of';
import type { AuditActor } from '../../system-identity/authentication/audit-actor';
import { normalizeContactPhone } from '../../phone/bolivian-mobile';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import {
  AdministrationError,
  requireOperations,
} from '../administration/administration-errors';
import type { ClientAccountStatus } from '../assistant/assistant-clients';
import {
  describeSubscription,
  type ClientSubscriptionSummary,
  type ClientSubscriptionView,
} from '../client/client-subscription';

// AW21 reduces the Subscription to what the directory row shows: the current
// Plan's name, or whether the Client had one before.
export type DirectorySubscriptionStatus = 'active' | 'expired' | 'none';

/** Clientas › Todas's chips (follow-up 232); «Todas» is no filter. */
export type ClientDirectoryFilter = DirectorySubscriptionStatus | 'founder';

export type AdministratorClientRow = {
  id: string;
  name: string;
  photo: ClientPhotoRef;
  email: string;
  phone: string | null;
  accountStatus: ClientAccountStatus;
  planName: string | null;
  subscriptionStatus: DirectorySubscriptionStatus;
  /** «Le quedan»: the active Subscription's classes, null without one. */
  remainingClassAllowance: number | null;
  originalClassAllowance: number | null;
  /** «Vence»: the active Plan's last day, or when the last one ended. */
  planEndsOn: Date | null;
  /** The live Fundadora place's number (WEB-040). */
  founderNumber: number | null;
  /** «Invitada por»: the Client or Trainer whose code she used. */
  invitedByName: string | null;
};

export type AdministratorClientPage = {
  items: AdministratorClientRow[];
  page: number;
  pageSize: number;
  /** Clients matching the search. */
  totalItems: number;
  /** Every Client of the studio, whatever the search. */
  studioClientCount: number;
  activePlanClientCount: number;
  /** Clients of the studio holding a live Fundadora place. */
  founderClientCount: number;
};

export type AdministratorClientRecord = {
  id: string;
  name: string;
  photo: ClientPhotoRef;
  email: string;
  phone: string | null;
  accountStatus: ClientAccountStatus;
  /** Bolivia civil date the Client was created. */
  clientSince: Date;
  referralCode: string;
  referredClientCount: number;
};

// What closing this Client's Account would cancel now (AW22, BE-007).
export type ClientClosureOutlook = {
  futureBookingCount: number;
  activeWaitlistEntryCount: number;
  upcomingEvaluationCount: number;
  /** Closure is refused while a transfer Payment awaits review (G3). */
  transferPaymentPending: boolean;
};

export type AdministratorClientDetail = AdministratorClientRecord & {
  subscription: ClientSubscriptionView;
  /** Credit is retired (PAY-005); the field stays as a zero. */
  creditAvailableCentavos: number;
  closure: ClientClosureOutlook;
};

export interface AdministratorClientDirectory {
  list: (input: {
    page: number;
    pageSize: number;
    query?: string;
    filter?: ClientDirectoryFilter;
    today: Date;
  }) => Promise<AdministratorClientPage>;
  read: (clientId: string) => Promise<AdministratorClientRecord | null>;
  findActiveSubscription: (
    clientId: string,
    onDate: Date,
  ) => Promise<ClientSubscriptionSummary | null>;
  findLatestSubscription: (
    clientId: string,
  ) => Promise<ClientSubscriptionSummary | null>;
  readClosureOutlook: (
    clientId: string,
    now: Date,
  ) => Promise<ClientClosureOutlook>;
  saveProfile: (
    input: ClientProfileCorrection,
  ) => Promise<AdministratorClientRecord>;
}

export type ClientProfileCorrection = {
  clientId: string;
  name: string;
  phone: string | null;
  /** Who the audit record names (ADR-0100). */
  actor: AuditActor;
  occurredAt: Date;
  previous: { name: string; phone: string | null };
};

type Dependencies = {
  directory: AdministratorClientDirectory;
  now: () => Date;
};

// Client personal data is for the Administrator and the Coordinator
// (ADR-0054, ADR-0102); Assistants keep their own bounded search for acting on
// a Client's behalf.
export type ClientDirectoryQuery = {
  page: number;
  pageSize: number;
  query?: string;
  filter?: ClientDirectoryFilter;
};

export const listAdministratorClients = async (
  command: ClientDirectoryQuery,
  principal: AuthenticatedPrincipal,
  { directory, now }: Dependencies,
): Promise<AdministratorClientPage> => {
  requireOperations(principal);
  const query = command.query?.trim() ?? '';
  return directory.list({
    page: command.page,
    pageSize: command.pageSize,
    ...(query === '' ? {} : { query }),
    ...(command.filter === undefined ? {} : { filter: command.filter }),
    today: boliviaDate(now()),
  });
};

export const readAdministratorClient = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  { directory, now }: Dependencies,
): Promise<AdministratorClientDetail> => {
  requireOperations(principal);
  const client = await directory.read(command.clientId);
  if (client === null) throw new AdministrationError('client_not_found');
  const instant = now();
  const [subscription, closure] = await Promise.all([
    describeSubscription(client.id, {
      today: boliviaDate(instant),
      findActiveSubscription: (clientId, onDate) =>
        directory.findActiveSubscription(clientId, onDate),
      findLatestSubscription: (clientId) =>
        directory.findLatestSubscription(clientId),
      findFutureSubscription: () => Promise.resolve(null),
    }),
    directory.readClosureOutlook(client.id, instant),
  ]);
  // Credit is retired (booking ADR-0009); the field stays as a zero.
  return { ...client, subscription, creditAvailableCentavos: 0, closure };
};

// IDN-009: correcting a Client's name and phone (AW22 «Editar perfil»). The
// login email stays the Client's own, through IDN-008's verified change.
export const updateAdministratorClientProfile = async (
  command: { clientId: string; name: string; phone: string | null },
  principal: AuthenticatedPrincipal,
  { directory, now }: Dependencies,
): Promise<AdministratorClientRecord> => {
  const actor = requireOperations(principal);
  const name = command.name.trim();
  if (name === '') throw new AdministrationError('client_name_required');
  const client = await directory.read(command.clientId);
  if (client === null) throw new AdministrationError('client_not_found');
  return directory.saveProfile({
    clientId: client.id,
    name,
    phone: normalizeContactPhone(command.phone),
    actor: actor.audit,
    occurredAt: now(),
    previous: { name: client.name, phone: client.phone },
  });
};
