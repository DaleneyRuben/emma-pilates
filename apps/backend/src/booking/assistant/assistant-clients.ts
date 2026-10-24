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

// Assistants act for any Client; Administrators cover every Branch.
const requireAssistant = (principal: AuthenticatedPrincipal): StaffIdentity => {
  if (
    principal.identity.kind !== 'staff' ||
    (principal.identity.role !== 'assistant' &&
      principal.identity.role !== 'administrator')
  ) {
    throw new BookingAccessDeniedError();
  }
  return principal.identity;
};

const actsAtBranch = (identity: StaffIdentity, branchId: string): boolean =>
  identity.role === 'administrator' || identity.branchIds.includes(branchId);

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
    readAvailableCredit(clientId: string): Promise<number>;
  },
): Promise<ClientOverview> => {
  requireAssistant(dependencies.principal);
  const client = await requireClient(command.clientId, dependencies);
  const [subscription, upcoming, history, creditAvailableCentavos] =
    await Promise.all([
      describeSubscription(client.id, dependencies),
      dependencies.findUpcoming({
        clientId: client.id,
        from: dependencies.now(),
      }),
      dependencies.findAttendedBookings(client.id),
      dependencies.readAvailableCredit(client.id),
    ]);

  return {
    client,
    subscription,
    nextBooking: upcoming[0] ?? null,
    recentHistory: history.slice(0, recentHistoryLength),
    creditAvailableCentavos,
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
    actionable: actsAtBranch(identity, item.branchId),
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
    listVisiblePlans(): Promise<PlanSummary[]>;
    readAvailableCredit(clientId: string): Promise<number>;
  },
): Promise<PlanQuotes> => {
  requireAssistant(dependencies.principal);
  const client = await requireClient(command.clientId, dependencies);
  const [plans, creditAvailableCentavos] = await Promise.all([
    dependencies.listVisiblePlans(),
    dependencies.readAvailableCredit(client.id),
  ]);

  return {
    creditAvailableCentavos,
    plans: [...plans]
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.id.localeCompare(right.id),
      )
      .map((plan) => {
        const creditAppliedCentavos = Math.min(
          creditAvailableCentavos,
          plan.priceCentavos,
        );
        return {
          ...plan,
          creditAppliedCentavos,
          amountDueCentavos: plan.priceCentavos - creditAppliedCentavos,
        };
      }),
  };
};

export const recordAssistantCashPayment = async (
  command: {
    clientId: string;
    planId: string;
    branchId: string;
    startsOn?: string;
    idempotencyKey: string;
  },
  dependencies: {
    principal: AuthenticatedPrincipal;
    recordCashPayment(
      command: {
        clientId: string;
        planId: string;
        branchId: string;
        startsOn?: string;
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
    },
    dependencies.principal,
    command.idempotencyKey,
  );
  const subscription = await dependencies.findLatestSubscription(
    command.clientId,
  );

  return { payment, subscription };
};
