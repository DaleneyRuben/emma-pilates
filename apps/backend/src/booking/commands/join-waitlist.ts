import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './create-booking';

type SessionForWaitlist = {
  id: string;
  branchId: string;
  startsAt: Date;
  capacity: number;
  state: 'scheduled' | 'cancelled';
};

type JoinWaitlistDependencies = {
  principal: AuthenticatedPrincipal;
  loadSession(sessionId: string): Promise<SessionForWaitlist | null>;
  countLiveBookings(sessionId: string): Promise<number>;
  findEligibleSubscription(input: {
    clientId: string;
    onDate: Date;
  }): Promise<{ id: string } | null>;
  hasLiveBooking(input: { sessionId: string; clientId: string }): Promise<boolean>;
  create(input: {
    sessionId: string;
    clientId: string;
    joinedByAccountId: string;
  }): Promise<{ id: string }>;
  now(): Date;
};

type JoinWaitlistCommand = {
  sessionId: string;
  clientId?: string;
};

const cancellationWindowMilliseconds = 2.5 * 60 * 60 * 1_000;

const resolveClientId = (
  command: JoinWaitlistCommand,
  session: SessionForWaitlist,
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

export const joinWaitlist = async (
  command: JoinWaitlistCommand,
  dependencies: JoinWaitlistDependencies,
): Promise<{ id: string }> => {
  const session = await dependencies.loadSession(command.sessionId);

  if (
    session === null ||
    session.state !== 'scheduled' ||
    session.startsAt.getTime() - dependencies.now().getTime() <=
      cancellationWindowMilliseconds
  ) {
    throw new BookingAccessDeniedError();
  }

  const clientId = resolveClientId(command, session, dependencies.principal);

  if ((await dependencies.countLiveBookings(session.id)) < session.capacity) {
    throw new Error('Session has capacity');
  }

  const subscription = await dependencies.findEligibleSubscription({
    clientId,
    onDate: session.startsAt,
  });

  if (subscription === null) {
    throw new Error('No eligible Subscription');
  }

  if (await dependencies.hasLiveBooking({ sessionId: session.id, clientId })) {
    throw new Error('Client already has a Booking');
  }

  return dependencies.create({
    sessionId: session.id,
    clientId,
    joinedByAccountId: dependencies.principal.accountId,
  });
};
