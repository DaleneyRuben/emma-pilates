import type { PrismaClient } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { createCatalogRepository } from '../catalog/prisma-catalog-repository';
import { toSubscriptionSummary } from '../client/client-subscription';
import type { PaymentCommands } from '../payments/prisma-payment-commands';
import { priceFounderPlanList } from '../payments/prisma-founder-membership';
import {
  listAssistantClientBookings,
  listAssistantClientHistory,
  quotePlansForClient,
  readClientOverview,
  recordAssistantCashPayment,
  searchClients,
} from './assistant-clients';
import type { AssistantClientOperations } from './assistant.controller';
import { createAssistantClientRepository } from './prisma-assistant-client-repository';

// Composes the Assistant use cases over the Booking repositories and the
// payment commands; every operation receives the authenticated principal.
export const createAssistantClientOperations = (input: {
  prisma: PrismaClient;
  payments: Pick<
    PaymentCommands,
    'recordCashPayment' | 'recordFrontDeskTransfer'
  >;
  now(): Date;
}): AssistantClientOperations => {
  const catalog = createCatalogRepository(input.prisma);
  const clients = createAssistantClientRepository(input.prisma);
  const subscriptions = {
    findActiveSubscription: (clientId: string, onDate: Date) =>
      catalog
        .findActiveSubscription(clientId, onDate)
        .then(toSubscriptionSummary),
    findFutureSubscription: (clientId: string, after: Date) =>
      catalog
        .findFutureSubscription(clientId, after)
        .then(toSubscriptionSummary),
    findLatestSubscription: (clientId: string) =>
      catalog.findLatestSubscription(clientId).then(toSubscriptionSummary),
  };

  return {
    search: (command, principal) =>
      searchClients(command, {
        principal,
        search: (input) => clients.searchClients(input),
      }),
    overview: (command, principal) =>
      readClientOverview(command, {
        principal,
        today: boliviaDate(input.now()),
        now: () => input.now(),
        findClient: (clientId) => clients.findClient(clientId),
        ...subscriptions,
        findUpcoming: (range) => catalog.findUpcomingClientBookings(range),
        findAttendedBookings: (clientId) =>
          catalog.findAttendedBookings(clientId),
        readAvailableCredit: (clientId) =>
          clients.readAvailableCredit(clientId),
      }),
    bookings: (command, principal) =>
      listAssistantClientBookings(command, {
        principal,
        now: () => input.now(),
        findClient: (clientId) => clients.findClient(clientId),
        findUpcoming: (range) => catalog.findUpcomingClientBookings(range),
      }),
    history: (command, principal) =>
      listAssistantClientHistory(command, {
        principal,
        findClient: (clientId) => clients.findClient(clientId),
        findAttendedBookings: (clientId) =>
          catalog.findAttendedBookings(clientId),
      }),
    planQuotes: (command, principal) =>
      quotePlansForClient(command, {
        principal,
        findClient: (clientId) => clients.findClient(clientId),
        listVisiblePlans: async (clientId) =>
          priceFounderPlanList(
            input.prisma,
            clientId,
            await catalog.listVisiblePlans(),
          ),
        readAvailableCredit: (clientId) =>
          clients.readAvailableCredit(clientId),
      }),
    recordCashPayment: (command, principal, idempotencyKey) =>
      recordAssistantCashPayment(
        { ...command, idempotencyKey },
        {
          principal,
          recordCashPayment: (cash, actor, key) =>
            input.payments.recordCashPayment(cash, actor, key),
          findLatestSubscription: subscriptions.findLatestSubscription,
        },
      ),
    recordFrontDeskTransfer: (command, principal, idempotencyKey) =>
      input.payments.recordFrontDeskTransfer(
        command,
        principal,
        idempotencyKey,
      ),
  };
};
