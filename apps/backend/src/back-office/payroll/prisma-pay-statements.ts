import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  addCivilDays,
  boliviaDate,
  boliviaInstant,
} from '../../time/bolivia-time';
import {
  BackOfficeError,
  requireAdministrator,
  requireTrainer,
  type BackOfficeActor,
} from '../back-office-errors';
import { recordBackOfficeAudit } from '../prisma-audit';
import { coordinatorPay } from './coordinator-pay';
import { isWholeMonth, monthPeriod, type PayPeriod } from './pay-period';
import {
  replaceDraft,
  withdrawStaleDrafts,
  type DraftMode,
} from './pay-statement-drafts';
import { statementSelect, toView, type DraftLine } from './pay-statement-rows';
import { trainerPay } from './trainer-pay';
import type { TrainerMonthFacts } from './trainer-pay-facts';
export type CoordinatorMonthFacts = {
  staffMemberIds: string[];
  newClients: {
    durationDays: number;
    classAllowance: number;
    broughtByTrainer: boolean;
  }[];
  renewalRatePercent: number | null;
  renewalTargetPercent: number;
};

// A period's pay is approved once it is over in Bolivia. The Coordinator's
// renewal bonus counts purchases up to 7 days after the month's last Plans
// end, so hers waits those 7 days too.
const approvableFrom = (statement: {
  periodEnd: Date;
  staffMember: { role: string };
}): Date =>
  boliviaInstant(
    statement.staffMember.role === 'COORDINATOR'
      ? addCivilDays(statement.periodEnd, 7)
      : statement.periodEnd,
    0,
  );

const windowOf = (query: { month: Date } | PayPeriod): PayPeriod =>
  'month' in query ? monthPeriod(query.month) : query;

// BKO-006: the worker drafts; the Administrator approves, which creates the
// Salary Payment. A Trainer reads only her own. Anyone else, including a
// Coordinator the Role does not wire yet, is denied. BKO-009 (ADR-0109): a
// Trainer's statement covers any period; the Coordinator's a whole month.
export const createPrismaPayStatements = (
  prisma: PrismaClient,
  dependencies: {
    now: () => Date;
    factsOfMonth: (from: Date, until: Date) => Promise<TrainerMonthFacts>;
    coordinatorFactsOfMonth?: (
      from: Date,
      until: Date,
    ) => Promise<CoordinatorMonthFacts>;
  },
) => {
  const draftPeriod = async (period: PayPeriod, mode: DraftMode) => {
    const facts = await dependencies.factsOfMonth(period.from, period.until);
    const now = dependencies.now();
    let drafted = 0;
    const current = new Set<string>();
    const draft = async (
      staffMemberId: string,
      pay: { lines: DraftLine[]; totalCentavos: number },
    ) => {
      current.add(staffMemberId);
      const outcome = await prisma
        .$transaction((transaction) =>
          replaceDraft(transaction, {
            staffMemberId,
            period,
            mode,
            lines: pay.lines,
            totalCentavos: pay.totalCentavos,
            now,
          }),
        )
        .catch((error: unknown) => {
          // The worker never fails on a race it would only lose again.
          if (
            mode === 'worker' &&
            error instanceof BackOfficeError &&
            error.code === 'pay_statement_period_overlaps'
          ) {
            return 'skipped' as const;
          }
          throw error;
        });
      if (outcome !== 'skipped') drafted += 1;
    };
    for (const trainer of facts.trainers) {
      const pay = trainerPay(facts.rates, trainer);
      if (pay.lines.length === 0) continue;
      await draft(trainer.staffMemberId, pay);
    }
    const coordinatorFacts =
      dependencies.coordinatorFactsOfMonth && isWholeMonth(period)
        ? await dependencies.coordinatorFactsOfMonth(period.from, period.until)
        : null;
    for (const staffMemberId of coordinatorFacts?.staffMemberIds ?? []) {
      await draft(staffMemberId, coordinatorPay(coordinatorFacts!));
    }
    await withdrawStaleDrafts(prisma, {
      period,
      current,
      roles:
        coordinatorFacts === null ? ['TRAINER'] : ['TRAINER', 'COORDINATOR'],
      now,
    });
    return { drafted };
  };

  return {
    // The hourly worker's whole month. It has no Account.
    draftMonth: (month: Date) => draftPeriod(monthPeriod(month), 'worker'),

    // The Administrator's day, week, range or month.
    draftPeriodAsAdministrator: async (
      period: PayPeriod,
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      return draftPeriod(period, 'administrator');
    },

    // Every statement the window touches. The Coordinator's whole month shows
    // only when the window is a whole month.
    listStatements: async (
      query: { month: Date } | PayPeriod,
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const window = windowOf(query);
      const rows = await prisma.payStatement.findMany({
        where: {
          deletedAt: null,
          periodStart: { lt: window.until },
          periodEnd: { gt: window.from },
          ...(isWholeMonth(window)
            ? {}
            : { staffMember: { role: { not: 'COORDINATOR' } } }),
        },
        orderBy: [{ staffMember: { name: 'asc' } }, { periodStart: 'asc' }],
        select: statementSelect,
      });
      return rows.map(toView);
    },

    listOwnStatements: async (principal: AuthenticatedPrincipal) => {
      const staffMemberId = requireTrainer(principal);
      const rows = await prisma.payStatement.findMany({
        where: { staffMemberId, deletedAt: null },
        orderBy: { periodStart: 'desc' },
        select: statementSelect,
      });
      return rows.map(toView);
    },

    approveStatement: async (
      input: { statementId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor: BackOfficeActor = requireAdministrator(principal);
      const now = dependencies.now();
      return prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT "id" FROM "back_office"."pay_statements"
           WHERE "id" = ${input.statementId}::uuid
           FOR UPDATE`;
        const statement = await transaction.payStatement.findFirst({
          where: { id: input.statementId, deletedAt: null },
          select: statementSelect,
        });
        if (statement === null) {
          throw new BackOfficeError('pay_statement_not_found');
        }
        if (statement.state === 'APPROVED') return toView(statement);
        if (now < approvableFrom(statement)) {
          throw new BackOfficeError('pay_statement_month_open');
        }
        const paidOn = boliviaDate(now);
        const payment = await transaction.salaryPayment.create({
          data: {
            staffMemberId: statement.staffMemberId,
            amountCentavos: statement.totalCentavos,
            paidOn,
            recordedByAccountId: actor.accountId,
            createdAt: now,
            updatedAt: now,
          },
          select: { id: true },
        });
        const approved = await transaction.payStatement.update({
          where: { id: statement.id },
          data: {
            state: 'APPROVED',
            salaryPaymentId: payment.id,
            approvedByAccountId: actor.accountId,
            approvedAt: now,
            updatedAt: now,
          },
          select: statementSelect,
        });
        await recordBackOfficeAudit(transaction, actor, {
          actionCode: 'pay_statement.approved',
          targetType: 'pay_statement',
          targetId: approved.id,
          branchId: null,
          metadata: {
            salaryPaymentId: payment.id,
            amountCentavos: approved.totalCentavos,
            paidOn: paidOn.toISOString().slice(0, 10),
          },
          occurredAt: now,
        });
        return toView(approved);
      });
    },
  };
};

export type PayStatements = ReturnType<typeof createPrismaPayStatements>;
