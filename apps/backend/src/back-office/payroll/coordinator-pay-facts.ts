import type { PrismaClient } from '../../generated/prisma/client';
import {
  readPlanRenewals,
  renewalRateOf,
} from '../../booking/payments/plan-renewals';
import { boliviaInstant } from '../../time/bolivia-time';
import { settingsInForce } from '../settings-in-force';
import { monthOfOperation, renewalTargetPercent } from './coordinator-pay';
import { readFirstPlans } from './first-plans';
import type { CoordinatorMonthFacts } from './prisma-pay-statements';

// Booking owns Payments, Subscriptions, and Studio Settings. Back Office
// asks for them here and never writes those tables (ADR-0103). A new Client
// is her first real Plan, approved in the month (Bolivia time). «Renovó» is
// booking's one definition (owner decision 5). Every active Coordinator is
// paid on the same facts.
export const coordinatorMonthFacts = async (
  prisma: PrismaClient,
  from: Date,
  until: Date,
): Promise<CoordinatorMonthFacts> => {
  const window = {
    from: boliviaInstant(from, 0),
    until: boliviaInstant(until, 0),
  };
  const [coordinators, settings, firsts, renewals, brought] = await Promise.all(
    [
      prisma.staffMember.findMany({
        where: {
          role: 'COORDINATOR',
          deletedAt: null,
          account: { disabledAt: null },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      }),
      settingsInForce(prisma, window.until),
      readFirstPlans(prisma),
      readPlanRenewals(prisma, from, until),
      prisma.clientAcquisition.findMany({
        where: {
          deletedAt: null,
          channel: 'TRAINER',
          referrerStaffMemberId: { not: null },
        },
        select: { clientId: true },
      }),
    ],
  );

  const broughtByTrainer = new Set(brought.map((row) => row.clientId));
  const openingDate = settings?.openingDate ?? from;
  return {
    staffMemberIds: coordinators.map((coordinator) => coordinator.id),
    newClients: [...firsts.values()]
      .filter(
        (first) =>
          first.decidedAt >= window.from && first.decidedAt < window.until,
      )
      .map((first) => ({
        durationDays: first.durationDays,
        classAllowance: first.classAllowance,
        broughtByTrainer: broughtByTrainer.has(first.clientId),
      })),
    renewalRatePercent: renewalRateOf(renewals),
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
