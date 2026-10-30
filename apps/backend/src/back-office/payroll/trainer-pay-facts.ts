import type { PrismaClient } from '../../generated/prisma/client';
import { boliviaInstant } from '../../time/bolivia-time';
import { readFirstPlans } from './first-plans';
import type { TrainerPayRates, TrainerPaySession } from './trainer-pay';

export type TrainerMonthFacts = {
  rates: TrainerPayRates;
  trainers: {
    staffMemberId: string;
    sessions: TrainerPaySession[];
    firstPlanPaymentsCentavos: number[];
  }[];
};

const cancellationCause = (
  cause:
    | 'ZERO_BOOKINGS'
    | 'NO_SUBSTITUTE_TRAINER'
    | 'SCHEDULE_CHANGED'
    | 'MINIMUM_NOT_MET'
    | null,
): string | null => (cause === 'MINIMUM_NOT_MET' ? 'minimum_not_met' : cause);

// Booking owns Sessions and Payments. Back Office asks for them here and
// never writes those tables (ADR-0103). A taught class needs its window-close
// snapshot; a minimum_not_met cancellation pays instead. The commission is
// the first real Plan of a Client the Trainer brought (never a single class,
// and never again after a voided first one). The month is cut in Bolivia.
export const trainerMonthFacts = async (
  prisma: PrismaClient,
  from: Date,
  until: Date,
): Promise<TrainerMonthFacts> => {
  const window = {
    from: boliviaInstant(from, 0),
    until: boliviaInstant(until, 0),
  };
  const [rate, sessions, brought, firsts] = await Promise.all([
    prisma.payRateRule.findFirst({
      where: { effectiveFrom: { lte: from } },
      orderBy: { effectiveFrom: 'desc' },
    }),
    prisma.session.findMany({
      where: {
        startsAt: { gte: window.from, lt: window.until },
        trainer: { role: 'TRAINER', deletedAt: null },
        OR: [
          { state: 'SCHEDULED', bookingsAtWindowClose: { not: null } },
          { state: 'CANCELLED', cancellationCause: 'MINIMUM_NOT_MET' },
        ],
      },
      select: {
        trainerStaffMemberId: true,
        bookingsAtWindowClose: true,
        cancellationCause: true,
      },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.clientAcquisition.findMany({
      where: {
        deletedAt: null,
        channel: 'TRAINER',
        referrerStaffMemberId: { not: null },
      },
      select: { clientId: true, referrerStaffMemberId: true },
    }),
    readFirstPlans(prisma),
  ]);
  if (rate === null) {
    throw new Error('pay_rate_rule_missing');
  }

  const trainerOfClient = new Map(
    brought.map((row) => [row.clientId, row.referrerStaffMemberId as string]),
  );
  const byTrainer = new Map<
    string,
    { sessions: TrainerPaySession[]; firstPlanPaymentsCentavos: number[] }
  >();
  const trainer = (id: string) => {
    const existing = byTrainer.get(id);
    if (existing !== undefined) return existing;
    const created = { sessions: [], firstPlanPaymentsCentavos: [] };
    byTrainer.set(id, created);
    return created;
  };
  for (const session of sessions) {
    trainer(session.trainerStaffMemberId).sessions.push({
      bookingsAtWindowClose: session.bookingsAtWindowClose,
      cancellationCause: cancellationCause(session.cancellationCause),
    });
  }
  for (const [clientId, first] of firsts) {
    if (first.decidedAt < window.from || first.decidedAt >= window.until) {
      continue;
    }
    const staffMemberId = trainerOfClient.get(clientId);
    if (staffMemberId === undefined) continue;
    trainer(staffMemberId).firstPlanPaymentsCentavos.push(
      first.amountDueCentavos,
    );
  }

  return {
    rates: {
      classCentavos: rate.classCentavos,
      includedStudents: rate.includedStudents,
      extraStudentCentavos: rate.extraStudentCentavos,
      minimumNotMetCentavos: rate.minimumNotMetCentavos,
      commissionPercent: rate.commissionPercent,
    },
    trainers: [...byTrainer].map(([staffMemberId, facts]) => ({
      staffMemberId,
      ...facts,
    })),
  };
};
