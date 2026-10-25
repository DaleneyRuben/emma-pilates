import type { PrismaClient } from '../../generated/prisma/client';
import {
  monthOfOperation,
  renewalRatePercent,
  renewalTargetPercent,
} from './coordinator-pay';
import type { CoordinatorMonthFacts } from './prisma-pay-statements';

// Booking owns Payments, Subscriptions, and Studio Settings. Back Office
// asks for them here and never writes those tables (ADR-0103). A new Client
// is her first confirmed Plan Payment of the month. A Plan renews when the
// next one starts before its end or within 7 days after it.
export const coordinatorMonthFacts = async (
  prisma: PrismaClient,
  from: Date,
  until: Date,
): Promise<CoordinatorMonthFacts> => {
  const [coordinator, settings, payments, subscriptions, brought] =
    await Promise.all([
      prisma.staffMember.findFirst({
        where: { role: 'COORDINATOR', deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      }),
      prisma.studioSettingsVersion.findFirst({
        orderBy: { version: 'desc' },
        select: {
          renewalTargetMonths1To6Percent: true,
          renewalTargetMonths7To12Percent: true,
          renewalTargetFromMonth13Percent: true,
          openingDate: true,
        },
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
          durationDaysSnapshot: true,
          classAllowanceSnapshot: true,
          decidedAt: true,
        },
        orderBy: { decidedAt: 'asc' },
      }),
      prisma.subscription.findMany({
        where: { endedByVoid: false, durationDaysSnapshot: { gte: 30 } },
        select: { clientId: true, startsOn: true, endsOn: true },
        orderBy: { startsOn: 'asc' },
      }),
      prisma.clientAcquisition.findMany({
        where: {
          deletedAt: null,
          channel: 'TRAINER',
          referrerStaffMemberId: { not: null },
        },
        select: { clientId: true },
      }),
    ]);

  const broughtByTrainer = new Set(brought.map((row) => row.clientId));
  const firstPaid = new Map<
    string,
    {
      decidedAt: Date;
      durationDays: number;
      classAllowance: number;
    }
  >();
  for (const payment of payments) {
    if (firstPaid.has(payment.clientId)) continue;
    firstPaid.set(payment.clientId, {
      decidedAt: payment.decidedAt as Date,
      durationDays: payment.durationDaysSnapshot,
      classAllowance: payment.classAllowanceSnapshot,
    });
  }

  const ending = subscriptions
    .filter(
      (subscription) =>
        subscription.endsOn >= from && subscription.endsOn < until,
    )
    .map((subscription) => ({
      endsOn: subscription.endsOn,
      nextPlanStartsOn:
        subscriptions
          .filter(
            (next) =>
              next.clientId === subscription.clientId &&
              next.startsOn > subscription.startsOn,
          )
          .map((next) => next.startsOn)
          .sort((left, right) => left.getTime() - right.getTime())[0] ?? null,
    }));

  const openingDate = settings?.openingDate ?? from;
  return {
    staffMemberId: coordinator?.id ?? null,
    newClients: [...firstPaid]
      .filter(([, paid]) => paid.decidedAt >= from && paid.decidedAt < until)
      .map(([clientId, paid]) => ({
        durationDays: paid.durationDays,
        classAllowance: paid.classAllowance,
        broughtByTrainer: broughtByTrainer.has(clientId),
      })),
    renewalRatePercent: renewalRatePercent(ending),
    renewalTargetPercent: renewalTargetPercent(
      {
        months1To6Percent: settings?.renewalTargetMonths1To6Percent ?? 80,
        months7To12Percent: settings?.renewalTargetMonths7To12Percent ?? 85,
        fromMonth13Percent: settings?.renewalTargetFromMonth13Percent ?? 90,
      },
      monthOfOperation(openingDate, from),
    ),
  };
};
