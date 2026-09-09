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
  create(input: {
    sessionId: string;
    clientId: string;
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

  return dependencies.create({
    sessionId: session.id,
    clientId,
    createdByAccountId: dependencies.principal.accountId,
  });
};
