import {
  auditActorOf,
  type AuditActor,
} from '../../system-identity/authentication/audit-actor';
import { runsOperations } from '../staff-access';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './create-booking';

export type SessionForCancellation = {
  id: string;
  branchId: string;
  startsAt: Date;
  state: 'scheduled' | 'cancelled';
  liveBookingCount: number;
};

export type SessionCancellationResult = { affectedBookings: number };

type CancelSessionDependencies = {
  principal: AuthenticatedPrincipal;
  loadSession(sessionId: string): Promise<SessionForCancellation | null>;
  cancel(input: {
    sessionId: string;
    cancelledByAccountId: string;
    audit: AuditActor;
  }): Promise<SessionCancellationResult>;
  now(): Date;
};

// Last-resort cancellation when no substitute Trainer is available: only an
// Administrator or the Coordinator (ADR-0102), only a future scheduled Session
// that still has Bookings.
export const cancelSession = async (
  command: { sessionId: string },
  dependencies: CancelSessionDependencies,
): Promise<SessionCancellationResult> => {
  if (!runsOperations(dependencies.principal)) {
    throw new BookingAccessDeniedError();
  }

  const session = await dependencies.loadSession(command.sessionId);
  if (
    session === null ||
    session.state !== 'scheduled' ||
    session.startsAt.getTime() <= dependencies.now().getTime()
  ) {
    throw new Error('Session is not cancellable');
  }
  if (session.liveBookingCount === 0) {
    throw new Error('Session has no Bookings');
  }

  // ADR-0100: the Session and Bookings keep the acting Staff Member's Account;
  // the audit record names who acted, with her Role.
  return dependencies.cancel({
    sessionId: session.id,
    cancelledByAccountId: dependencies.principal.accountId,
    audit: auditActorOf(dependencies.principal),
  });
};
