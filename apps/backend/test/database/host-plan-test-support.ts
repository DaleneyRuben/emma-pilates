import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { boliviaDate } from '../../src/time/bolivia-time';

const dayMs = 24 * 60 * 60 * 1_000;

// Walkthrough n.º 22: only a host with a paid Plan in force opens a Guest
// Pass. Gives her a Subscription in force around `now`, paid with `method`
// (a Courtesy Access or a Guest Pass is `COURTESY`).
export const giveHostPlan = async (
  prisma: PrismaClient,
  input: {
    clientId: string;
    now: Date;
    method?: 'CASH' | 'COURTESY';
    endsInDays?: number;
    startsInDays?: number;
    voided?: boolean;
  },
) => {
  const author = await prisma.account.findFirstOrThrow({
    where: { email: 'emma.vargas@example.com', deletedAt: null },
    select: { id: true },
  });
  const method = input.method ?? 'CASH';
  const price = method === 'COURTESY' ? 0 : 56_000;
  const plan = await prisma.plan.create({
    data: {
      name: `Plan ${randomUUID()}`,
      durationDays: 30,
      classAllowance: 8,
      priceCentavos: price,
      displayOrder: 0,
      // A free Plan is always hidden, like the Courtesy Access one.
      hiddenAt: price === 0 ? input.now : null,
    },
  });
  const branch =
    method === 'CASH'
      ? await prisma.branch.findFirstOrThrow({
          where: { archivedAt: null },
          select: { id: true },
        })
      : null;
  // The rule reads Bolivia's civil date (ADR-0057); a UTC date runs a day
  // ahead from 20:00 in La Paz and made «ended yesterday» still in force.
  const day = boliviaDate(input.now);
  const startsOn = new Date(day.getTime() + (input.startsInDays ?? -2) * dayMs);
  const endsOn = new Date(day.getTime() + (input.endsInDays ?? 28) * dayMs);
  // A confirmed Payment and its Subscription are written together.
  await prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.create({
      data: {
        clientId: input.clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: 30,
        classAllowanceSnapshot: 8,
        planPriceCentavos: price,
        creditAppliedCentavos: 0,
        amountDueCentavos: price,
        startsOn,
        method,
        collectedAtBranchId: branch?.id ?? null,
        state: input.voided === true ? 'VOIDED' : 'CONFIRMED',
        ...(input.voided === true
          ? {
              voidedAt: startsOn,
              voidedByAccountId: author.id,
              voidReason: 'Venta registrada por error',
            }
          : {}),
        submittedByAccountId: author.id,
        submittedAt: startsOn,
        decidedByAccountId: author.id,
        decidedAt: startsOn,
      },
      select: { id: true },
    });
    await transaction.subscription.create({
      data: {
        clientId: input.clientId,
        planId: plan.id,
        paymentId: payment.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: 30,
        originalClassAllowance: 8,
        remainingClassAllowance: 8,
        startsOn,
        endsOn,
        activatedAt: startsOn,
      },
    });
  });
};
