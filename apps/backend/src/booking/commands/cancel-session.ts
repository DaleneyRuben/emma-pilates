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

// The owner's cancellation of a future scheduled Session, for when no
// substitute Trainer is available, a holiday, or a sick Trainer: only an
// Administrator or the Coordinator (ADR-0102). A Session with no Bookings is
// cancellable too (FIX-027, owner 2026-11-02); the empty-Session check before
// the start still cancels the ones nobody cancelled by hand.
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

  // ADR-0100: the Session and Bookings keep the acting Staff Member's Account;
  // the audit record names who acted, with her Role.
  return dependencies.cancel({
    sessionId: session.id,
    cancelledByAccountId: dependencies.principal.accountId,
    audit: auditActorOf(dependencies.principal),
  });
};
