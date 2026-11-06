import type {
  Prisma,
  PrismaClient,
  SessionCancellationCause,
  SessionState,
} from '../../generated/prisma/client';

// FIX-042 (DES-009, decisiones §20.24): why a cancelled Session the Horario
// and the Trainer's agenda still show was cancelled.
export const sessionCancellationCauses = [
  'minimum_not_met',
  'studio',
  'schedule_paused',
] as const;

export type SessionCancellation = {
  cause: (typeof sessionCancellationCauses)[number];
  cancelledAt: Date;
  bookedCount: number;
};

// A series change or end withdraws classes nobody booked; that is planning,
// not a cancellation anyone needs to read, so it stays hidden.
const shownCauses = {
  MINIMUM_NOT_MET: 'minimum_not_met',
  ZERO_BOOKINGS: 'minimum_not_met',
  NO_SUBSTITUTE_TRAINER: 'studio',
  SCHEDULE_PAUSED: 'schedule_paused',
} as const satisfies Partial<
  Record<SessionCancellationCause, SessionCancellation['cause']>
>;

export const shownSessionStates = (
  includeCancelled: boolean,
): Prisma.SessionWhereInput =>
  includeCancelled
    ? {
        OR: [
          { state: 'SCHEDULED' },
          {
            state: 'CANCELLED',
            cancellationCause: {
              in: Object.keys(shownCauses) as SessionCancellationCause[],
            },
          },
        ],
      }
    : { state: 'SCHEDULED' };

export const cancellationFields = {
  state: true,
  cancellationCause: true,
  cancelledAt: true,
} as const;

type CancellationFields = {
  id: string;
  state: SessionState;
  cancellationCause: SessionCancellationCause | null;
  cancelledAt: Date | null;
};

// The Bookings the cancellation itself closed: what the class had booked.
export const countBookingsAtCancellation = async (
  prisma: PrismaClient,
  sessions: CancellationFields[],
): Promise<Map<string, number>> => {
  const ids = sessions
    .filter((session) => session.state === 'CANCELLED')
    .map((session) => session.id);
  if (ids.length === 0) return new Map();
  const counts = await prisma.booking.groupBy({
    by: ['sessionId'],
    where: {
      sessionId: { in: ids },
      state: 'CANCELLED',
      cancellationCause: 'SESSION_CANCELLED',
    },
    _count: { _all: true },
  });
  return new Map(counts.map((row) => [row.sessionId, row._count._all]));
};

export const toSessionCancellation = (
  session: CancellationFields,
  bookedAtCancellation: Map<string, number>,
): SessionCancellation | null => {
  if (
    session.state !== 'CANCELLED' ||
    session.cancelledAt === null ||
    session.cancellationCause === null ||
    !(session.cancellationCause in shownCauses)
  )
    return null;
  return {
    cause: shownCauses[session.cancellationCause as keyof typeof shownCauses],
    cancelledAt: session.cancelledAt,
    bookedCount: bookedAtCancellation.get(session.id) ?? 0,
  };
};
