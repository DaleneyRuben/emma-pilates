import {
  AllowanceAdjustmentReason,
  PaymentKind,
  PaymentMethod,
  PaymentState,
  PurchaseIntentState,
  SubscriptionState,
  type PrismaClient,
} from '../../../generated/prisma/client';
import {
  courtesyAccessPlan,
  legacyCourtesyPlanName,
} from '../../../booking/payments/courtesy-access';
import { boliviaDate } from '../../../time/bolivia-time';
import type { CourtesyFacts, SaleBlock } from './tester-move';

export const quarterlyPlanName = 'Trimestral 36 clases';

export type CourtesyTester = {
  clientId: string;
  name: string;
  email: string | null;
  courtesyEndsOn: Date;
  courtesy: CourtesyFacts;
  inForce: boolean;
  hasPaidPlan: boolean;
  saleBlock: SaleBlock | null;
};

const sum = (rows: { classes: number }[]): number =>
  rows.reduce((total, row) => total + row.classes, 0);

// Whether she already holds a paid Plan in force or queued: anything but a
// courtesy Payment, as Walkthrough n.º 22's rule reads it, or a Plan sold
// before the app recorded payments.
const hasPaidPlan = async (
  prisma: PrismaClient,
  clientId: string,
  today: Date,
): Promise<boolean> =>
  (await prisma.subscription.findFirst({
    where: {
      clientId,
      state: SubscriptionState.ACTIVE,
      endsOn: { gte: today },
      OR: [
        { paymentId: null },
        {
          payment: {
            method: { not: PaymentMethod.COURTESY },
            voidedAt: null,
            planPriceCentavos: { gt: 0 },
          },
        },
      ],
    },
    select: { id: true },
  })) !== null;

// What the cash sale refuses before it writes (purchase-eligibility.ts), so
// the run holds her instead of finding out halfway.
const saleBlockOf = async (
  prisma: PrismaClient,
  clientId: string,
  now: Date,
  today: Date,
): Promise<SaleBlock | null> => {
  const [intent, pending, future] = await Promise.all([
    prisma.purchaseIntent.findFirst({
      where: {
        clientId,
        state: PurchaseIntentState.OPEN,
        expiresAt: { gt: now },
      },
      select: { id: true },
    }),
    prisma.payment.findFirst({
      where: { clientId, state: PaymentState.PENDING, kind: PaymentKind.PLAN },
      select: { id: true },
    }),
    prisma.subscription.findFirst({
      where: {
        clientId,
        state: SubscriptionState.ACTIVE,
        startsOn: { gt: today },
      },
      select: { id: true },
    }),
  ]);
  if (intent !== null) return 'purchase_intent_open_exists';
  if (pending !== null) return 'payment_pending_exists';
  if (future !== null) return 'future_subscription_exists';
  return null;
};

// Every Client whose Plan in force today is the hidden courtesy one, under
// either name its Subscription snapshot may carry. A Guest Pass is a
// courtesy Payment too, but never under these names.
export const findCourtesyTesters = async (
  prisma: PrismaClient,
  now: Date,
): Promise<CourtesyTester[]> => {
  const today = boliviaDate(now);
  const rows = await prisma.subscription.findMany({
    where: {
      state: SubscriptionState.ACTIVE,
      startsOn: { lte: today },
      // Also one that ended with courtesy extras still live: a run stopped
      // between the sale and the removal left them.
      OR: [
        { endsOn: { gte: today } },
        {
          allowanceAdjustments: {
            some: {
              deletedAt: null,
              reason: AllowanceAdjustmentReason.COURTESY,
            },
          },
        },
      ],
      planNameSnapshot: {
        in: [courtesyAccessPlan.name, legacyCourtesyPlanName],
      },
      payment: { method: PaymentMethod.COURTESY },
      client: { deletedAt: null },
    },
    orderBy: [{ client: { name: 'asc' } }, { id: 'asc' }],
    select: {
      id: true,
      clientId: true,
      planNameSnapshot: true,
      endsOn: true,
      client: {
        select: { name: true, account: { select: { email: true } } },
      },
      allowanceAdjustments: {
        where: { deletedAt: null },
        select: { classes: true, reason: true },
      },
      bookings: {
        where: { state: 'BOOKED', session: { startsAt: { gt: now } } },
        orderBy: { session: { startsAt: 'desc' } },
        take: 1,
        select: { session: { select: { startsAt: true } } },
      },
    },
  });
  const testers: CourtesyTester[] = [];
  for (const row of rows) {
    const lastBooked = row.bookings[0]?.session.startsAt;
    testers.push({
      clientId: row.clientId,
      name: row.client.name,
      email: row.client.account?.email ?? null,
      courtesyEndsOn: row.endsOn,
      courtesy: {
        subscriptionId: row.id,
        planName: row.planNameSnapshot,
        courtesyExtras: sum(
          row.allowanceAdjustments.filter(
            (adjustment) =>
              adjustment.reason === AllowanceAdjustmentReason.COURTESY,
          ),
        ),
        netExtras: sum(row.allowanceAdjustments),
        lastBookedOn: lastBooked === undefined ? null : boliviaDate(lastBooked),
      },
      inForce: row.endsOn.getTime() >= today.getTime(),
      hasPaidPlan: await hasPaidPlan(prisma, row.clientId, today),
      saleBlock: await saleBlockOf(prisma, row.clientId, now, today),
    });
  }
  return testers;
};

// The Branch the cash is recorded at: the one named, or the studio's only one.
export const resolveBranch = async (
  prisma: PrismaClient,
  name: string | null,
): Promise<{ id: string; name: string }> => {
  const branches = await prisma.branch.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true },
  });
  if (name === null) {
    if (branches.length !== 1) throw new Error('branch_required');
    return branches[0];
  }
  const named = branches.find(
    (branch) => branch.name.toLowerCase() === name.toLowerCase(),
  );
  if (named === undefined) throw new Error('branch_missing');
  return named;
};

export const resolveQuarterlyPlan = async (
  prisma: PrismaClient,
): Promise<{ id: string; priceCentavos: number }> => {
  const plan = await prisma.plan.findFirst({
    where: {
      name: quarterlyPlanName,
      hiddenAt: null,
      priceCentavos: { gt: 0 },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, priceCentavos: true },
  });
  if (plan === null) throw new Error('plan_missing');
  return plan;
};
