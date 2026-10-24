import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  StaffRole,
} from '../../generated/prisma/enums';
import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';

type AttendanceOutcome = 'attended' | 'no_show';

// A correction is a saved outcome that differs from the one already stored.
// The first roster save stays unaudited (ADR-0055); only a changed outcome
// writes a record, naming both values.
export const recordAttendanceCorrections = async (
  transaction: Prisma.TransactionClient,
  input: {
    sessionId: string;
    branchId: string;
    outcomes: { bookingId: string; outcome: AttendanceOutcome }[];
    principal: AuthenticatedPrincipal;
    occurredAt: Date;
  },
): Promise<void> => {
  const existing = await transaction.attendanceRecord.findMany({
    where: {
      bookingId: { in: input.outcomes.map(({ bookingId }) => bookingId) },
    },
    select: { bookingId: true, outcome: true },
  });
  const previous = new Map(
    existing.map((record) => [
      record.bookingId,
      record.outcome === 'ATTENDED' ? 'attended' : 'no_show',
    ]),
  );
  const actor = auditActorOf(input.principal);

  for (const { bookingId, outcome } of input.outcomes) {
    const previousOutcome = previous.get(bookingId);
    if (previousOutcome === undefined || previousOutcome === outcome) continue;

    await transaction.auditRecord.create({
      data: {
        actionCode: 'attendance.corrected',
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: actor.accountId,
        actorRole: actor.role === null ? null : StaffRole[actor.role],
        impersonationId: actor.impersonationId,
        targetType: 'booking',
        targetId: bookingId,
        branchId: input.branchId,
        correlationId: input.sessionId,
        metadata: { previousOutcome, outcome },
        occurredAt: input.occurredAt,
      },
    });
  }
};
