import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import {
  AdministrationError,
  requireAdministrator,
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

export type AdministratorClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  accountStatus: ClientAccountStatus;
  planName: string | null;
  subscriptionStatus: DirectorySubscriptionStatus;
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
};

export type AdministratorClientRecord = {
  id: string;
  name: string;
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
  creditAvailableCentavos: number;
  closure: ClientClosureOutlook;
};

export interface AdministratorClientDirectory {
  list: (input: {
    page: number;
    pageSize: number;
    query?: string;
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
  readAvailableCredit: (clientId: string) => Promise<number>;
  readClosureOutlook: (
    clientId: string,
    now: Date,
  ) => Promise<ClientClosureOutlook>;
}

type Dependencies = {
  directory: AdministratorClientDirectory;
  now: () => Date;
};

// Client personal data is for Administrators only (ADR-0054); Assistants
// keep their own bounded search for acting on a Client's behalf.
export const listAdministratorClients = async (
  command: { page: number; pageSize: number; query?: string },
  principal: AuthenticatedPrincipal,
  { directory, now }: Dependencies,
): Promise<AdministratorClientPage> => {
  requireAdministrator(principal);
  const query = command.query?.trim() ?? '';
  return directory.list({
    page: command.page,
    pageSize: command.pageSize,
    ...(query === '' ? {} : { query }),
    today: boliviaDate(now()),
  });
};

export const readAdministratorClient = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  { directory, now }: Dependencies,
): Promise<AdministratorClientDetail> => {
  requireAdministrator(principal);
  const client = await directory.read(command.clientId);
  if (client === null) throw new AdministrationError('client_not_found');
  const instant = now();
  const [subscription, creditAvailableCentavos, closure] = await Promise.all([
    describeSubscription(client.id, {
      today: boliviaDate(instant),
      findActiveSubscription: (clientId, onDate) =>
        directory.findActiveSubscription(clientId, onDate),
      findLatestSubscription: (clientId) =>
        directory.findLatestSubscription(clientId),
    }),
    directory.readAvailableCredit(client.id),
    directory.readClosureOutlook(client.id, instant),
  ]);
  return { ...client, subscription, creditAvailableCentavos, closure };
};
