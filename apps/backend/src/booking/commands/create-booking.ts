import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

export class BookingAccessDeniedError extends Error {
  constructor() {
    super('Booking access is denied');
  }
}

type SessionForBooking = {
  id: string;
  branchId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  state: 'scheduled' | 'cancelled';
};

type CreateBookingDependencies = {
  principal: AuthenticatedPrincipal;
  loadSession(sessionId: string): Promise<SessionForBooking | null>;
  countLiveBookings(sessionId: string): Promise<number>;
  findEligibleSubscription(input: {
    clientId: string;
    onDate: Date;
  }): Promise<{ id: string } | null>;
  create(input: {
    sessionId: string;
    clientId: string;
    subscriptionId: string;
    createdByAccountId: string;
  }): Promise<{ id: string }>;
  now(): Date;
};

type CreateBookingCommand = {
  sessionId: string;
  clientId?: string;
};

const resolveClientId = (
  command: CreateBookingCommand,
  session: SessionForBooking,
  principal: AuthenticatedPrincipal,
): string => {
  if (principal.identity.kind === 'client') {
    if (
      command.clientId !== undefined &&
      command.clientId !== principal.identity.clientId
    ) {
      throw new BookingAccessDeniedError();
    }

    return principal.identity.clientId;
  }

  if (
    principal.identity.role !== 'assistant' ||
    command.clientId === undefined ||
    !principal.identity.branchIds.includes(session.branchId)
  ) {
    throw new BookingAccessDeniedError();
  }

  return command.clientId;
};

export const createBooking = async (
  command: CreateBookingCommand,
  dependencies: CreateBookingDependencies,
): Promise<{ id: string }> => {
  const session = await dependencies.loadSession(command.sessionId);

  if (
    session === null ||
    session.state !== 'scheduled' ||
    session.startsAt <= dependencies.now()
  ) {
    throw new BookingAccessDeniedError();
  }

  const clientId = resolveClientId(command, session, dependencies.principal);

  if ((await dependencies.countLiveBookings(session.id)) >= session.capacity) {
    throw new Error('Session is full');
  }

  const subscription = await dependencies.findEligibleSubscription({
    clientId,
    onDate: session.startsAt,
  });

  if (subscription === null) {
    throw new Error('No eligible Subscription');
  }

  return dependencies.create({
    sessionId: session.id,
    clientId,
    subscriptionId: subscription.id,
    createdByAccountId: dependencies.principal.accountId,
  });
};
