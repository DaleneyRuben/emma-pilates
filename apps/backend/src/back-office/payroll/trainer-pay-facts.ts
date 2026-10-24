import type { PrismaClient } from '../../generated/prisma/client';
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
// the first confirmed Plan Payment of a Client the Trainer brought.
export const trainerMonthFacts = async (
  prisma: PrismaClient,
  from: Date,
  until: Date,
): Promise<TrainerMonthFacts> => {
  const [rate, sessions, brought, payments] = await Promise.all([
    prisma.payRateRule.findFirst({
      where: { effectiveFrom: { lte: from } },
      orderBy: { effectiveFrom: 'desc' },
    }),
    prisma.session.findMany({
      where: {
        startsAt: { gte: from, lt: until },
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
    prisma.payment.findMany({
      where: {
        state: 'CONFIRMED',
        kind: 'PLAN',
        method: { in: ['TRANSFER', 'CASH'] },
        decidedAt: { not: null },
      },
      select: {
        clientId: true,
        amountDueCentavos: true,
        decidedAt: true,
      },
      orderBy: { decidedAt: 'asc' },
    }),
  ]);
  if (rate === null) {
    throw new Error('pay_rate_rule_missing');
  }

  const trainerOfClient = new Map(
    brought.map((row) => [row.clientId, row.referrerStaffMemberId as string]),
  );
  const firstPaid = new Map<string, { decidedAt: Date; amount: number }>();
  for (const payment of payments) {
    if (!trainerOfClient.has(payment.clientId)) continue;
    if (firstPaid.has(payment.clientId)) continue;
    firstPaid.set(payment.clientId, {
      decidedAt: payment.decidedAt as Date,
      amount: payment.amountDueCentavos,
    });
  }

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
  for (const [clientId, paid] of firstPaid) {
    if (paid.decidedAt < from || paid.decidedAt >= until) continue;
    const staffMemberId = trainerOfClient.get(clientId);
    if (staffMemberId === undefined) continue;
    trainer(staffMemberId).firstPlanPaymentsCentavos.push(paid.amount);
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
