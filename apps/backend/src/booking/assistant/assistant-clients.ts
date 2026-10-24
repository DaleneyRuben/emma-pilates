import { worksAtBranch } from '../staff-access';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { PlanSummary } from '../catalog/catalog-repository';
import type { ClassHistoryEntry } from '../class-history';
import type { UpcomingClientBooking } from '../client/client-bookings';
import {
  describeSubscription,
  type ClientSubscriptionSummary,
  type ClientSubscriptionView,
} from '../client/client-subscription';
import { BookingAccessDeniedError } from '../commands/create-booking';
import type { InvoiceData } from '../payments/invoice-data/invoice-data';
import type { PaymentView } from '../payments/prisma-payment-commands';

export class ClientNotFoundError extends Error {
  constructor() {
    super('Client not found');
  }
}

// Booking reads the Account only to tell an activated Client from one whose
// invitation or verification is still pending; the details of that pending
// flow belong to System Identity.
export type ClientAccountStatus = 'active' | 'pending' | 'disabled';

export type AssistantClientSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  accountStatus: ClientAccountStatus;
};

export type AssistantClientBooking = UpcomingClientBooking & {
  actionable: boolean;
};

export type ClientOverview = {
  client: AssistantClientSummary;
  subscription: ClientSubscriptionView;
  nextBooking: UpcomingClientBooking | null;
  recentHistory: ClassHistoryEntry[];
  creditAvailableCentavos: number;
};

export type PlanQuote = PlanSummary & {
  creditAppliedCentavos: number;
  amountDueCentavos: number;
};

export type PlanQuotes = {
  creditAvailableCentavos: number;
  plans: PlanQuote[];
};

export type AssistantCashPaymentResult = {
  payment: PaymentView;
  subscription: ClientSubscriptionSummary | null;
};

const searchLimit = 20;
const recentHistoryLength = 2;

type StaffIdentity = Extract<
  AuthenticatedPrincipal['identity'],
  { kind: 'staff' }
>;

// Assistants act for any Client; Administrators and the Coordinator cover
// every Branch (ADR-0102).
const requireAssistant = (principal: AuthenticatedPrincipal): StaffIdentity => {
  if (
    principal.identity.kind !== 'staff' ||
    (principal.identity.role !== 'assistant' &&
      principal.identity.role !== 'administrator' &&
      principal.identity.role !== 'coordinator')
  ) {
    throw new BookingAccessDeniedError();
  }
  return principal.identity;
};

// Selling stays with the front desk and the Administrator: the Coordinator
// never sees a price or a Credit amount (ADR-0102).
const requireSeller = (principal: AuthenticatedPrincipal): StaffIdentity => {
  const identity = requireAssistant(principal);
  if (identity.role === 'coordinator') throw new BookingAccessDeniedError();
  return identity;
};

type ClientLookup = {
  findClient(clientId: string): Promise<AssistantClientSummary | null>;
};

const requireClient = async (
  clientId: string,
  dependencies: ClientLookup,
): Promise<AssistantClientSummary> => {
  const client = await dependencies.findClient(clientId);
  if (client === null) throw new ClientNotFoundError();
  return client;
};

export const searchClients = async (
  command: { query: string },
  dependencies: {
    principal: AuthenticatedPrincipal;
    search(input: {
      query: string;
      limit: number;
    }): Promise<AssistantClientSummary[]>;
  },
): Promise<AssistantClientSummary[]> => {
  requireAssistant(dependencies.principal);
  return dependencies.search({
    query: command.query.trim(),
    limit: searchLimit,
  });
};

export const readClientOverview = async (
  command: { clientId: string },
  dependencies: ClientLookup & {
    principal: AuthenticatedPrincipal;
    today: Date;
    now(): Date;
    findActiveSubscription(
      clientId: string,
      onDate: Date,
    ): Promise<ClientSubscriptionSummary | null>;
    findLatestSubscription(
      clientId: string,
    ): Promise<ClientSubscriptionSummary | null>;
    findFutureSubscription(
      clientId: string,
      after: Date,
    ): Promise<ClientSubscriptionSummary | null>;
    findUpcoming(input: {
      clientId: string;
      from: Date;
    }): Promise<UpcomingClientBooking[]>;
    findAttendedBookings(clientId: string): Promise<ClassHistoryEntry[]>;
  },
): Promise<ClientOverview> => {
  requireAssistant(dependencies.principal);
  const client = await requireClient(command.clientId, dependencies);
  const [subscription, upcoming, history] = await Promise.all([
    describeSubscription(client.id, dependencies),
    dependencies.findUpcoming({
      clientId: client.id,
      from: dependencies.now(),
    }),
    dependencies.findAttendedBookings(client.id),
  ]);

  return {
    client,
    subscription,
    nextBooking: upcoming[0] ?? null,
    recentHistory: history.slice(0, recentHistoryLength),
    // Credit is retired (booking ADR-0009); store builds still read it.
    creditAvailableCentavos: 0,
  };
};

export const listAssistantClientBookings = async (
  command: { clientId: string },
  dependencies: ClientLookup & {
    principal: AuthenticatedPrincipal;
    now(): Date;
    findUpcoming(input: {
      clientId: string;
      from: Date;
    }): Promise<UpcomingClientBooking[]>;
  },
): Promise<AssistantClientBooking[]> => {
  const identity = requireAssistant(dependencies.principal);
  const client = await requireClient(command.clientId, dependencies);
  const upcoming = await dependencies.findUpcoming({
    clientId: client.id,
    from: dependencies.now(),
  });

  return upcoming.map((item) => ({
    ...item,
    actionable: worksAtBranch(identity, item.branchId),
  }));
};

export const listAssistantClientHistory = async (
  command: { clientId: string },
  dependencies: ClientLookup & {
    principal: AuthenticatedPrincipal;
    findAttendedBookings(clientId: string): Promise<ClassHistoryEntry[]>;
  },
): Promise<ClassHistoryEntry[]> => {
  requireAssistant(dependencies.principal);
  const client = await requireClient(command.clientId, dependencies);
  return dependencies.findAttendedBookings(client.id);
};

export const quotePlansForClient = async (
  command: { clientId: string },
  dependencies: ClientLookup & {
    principal: AuthenticatedPrincipal;
    listVisiblePlans(clientId: string): Promise<PlanSummary[]>;
  },
): Promise<PlanQuotes> => {
  requireSeller(dependencies.principal);
  const client = await requireClient(command.clientId, dependencies);
  const plans = await dependencies.listVisiblePlans(client.id);

  // Credit is retired (booking ADR-0009): every Plan costs its full price.
  return {
    creditAvailableCentavos: 0,
    plans: [...plans]
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.id.localeCompare(right.id),
      )
      .map((plan) => ({
        ...plan,
        creditAppliedCentavos: 0,
        amountDueCentavos: plan.priceCentavos,
      })),
  };
};

export const recordAssistantCashPayment = async (
  command: {
    clientId: string;
    planId: string;
    branchId: string;
    startsOn?: string;
    idempotencyKey: string;
    invoiceData?: InvoiceData | null;
  },
  dependencies: {
    principal: AuthenticatedPrincipal;
    recordCashPayment(
      command: {
        clientId: string;
        planId: string;
        branchId: string;
        startsOn?: string;
        invoiceData: InvoiceData | null;
      },
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ): Promise<PaymentView>;
    findLatestSubscription(
      clientId: string,
    ): Promise<ClientSubscriptionSummary | null>;
  },
): Promise<AssistantCashPaymentResult> => {
  const payment = await dependencies.recordCashPayment(
    {
      clientId: command.clientId,
      planId: command.planId,
      branchId: command.branchId,
      ...(command.startsOn === undefined ? {} : { startsOn: command.startsOn }),
      invoiceData: command.invoiceData ?? null,
    },
    dependencies.principal,
    command.idempotencyKey,
  );
  const subscription = await dependencies.findLatestSubscription(
    command.clientId,
  );

  return { payment, subscription };
};
