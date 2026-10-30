import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  PaymentMethod,
  PaymentState,
} from '../../generated/prisma/enums';
import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate, boliviaInstant } from '../../time/bolivia-time';
import {
  BackOfficeError,
  databaseCause,
  requireAdministrator,
} from '../back-office-errors';
import { requireActiveBranch } from '../booking-references';
import { civilText } from '../prisma-audit';
import { runIdempotent } from '../prisma-idempotency';
import {
  cashDayStatus,
  cashDayWindow,
  describeCashClose,
  requireCashCount,
  type CashDayStatus,
} from './cash-close-rules';

type Database = Prisma.TransactionClient | PrismaClient;

export type CashCloseView = {
  id: string;
  branchId: string;
  businessDate: Date;
  expectedCentavos: number;
  cashPaymentCount: number;
  countedCentavos: number;
  differenceCentavos: number;
  note: string | null;
  closedAt: Date;
  closedByName: string;
};

export type CashToday = {
  branchId: string;
  businessDate: Date;
  expectedCentavos: number;
  cashPaymentCount: number;
  /** Voided cash sales still in the drawer: part of expectedCentavos. */
  voidedCashCentavos: number;
  close: CashCloseView | null;
};

export type CashDay = {
  businessDate: Date;
  status: CashDayStatus;
  cashSalesCentavos: number;
  cashPaymentCount: number;
  /** Voided cash sales still in the drawer: part of cashSalesCentavos. */
  voidedCashCentavos: number;
  close: (CashCloseView & { adjustmentCentavos: number }) | null;
};

export type CashCloseHistory = {
  branchId: string;
  month: string;
  missingDays: number;
  days: CashDay[];
};

// Cash in the drawer: a confirmed cash Payment, and a voided one too, since a
// void returns no money (owner decision 4, 2026-10-28). The voided part is
// shown on its own line; money given back is recorded as an outflow.
const cashIncome = (branchId: string, from: Date, until: Date) =>
  ({
    method: PaymentMethod.CASH,
    state: { in: [PaymentState.CONFIRMED, PaymentState.VOIDED] },
    collectedAtBranchId: branchId,
    decidedAt: { gte: from, lt: until },
  }) satisfies Prisma.PaymentWhereInput;

const closeSelect = {
  id: true,
  branchId: true,
  businessDate: true,
  expectedCentavos: true,
  cashPaymentCount: true,
  countedCentavos: true,
  note: true,
  closedAt: true,
  closedByAccount: { select: { staffMember: { select: { name: true } } } },
} satisfies Prisma.CashCloseSelect;

type CloseRow = Prisma.CashCloseGetPayload<{ select: typeof closeSelect }>;

const toCloseView = ({
  closedByAccount,
  ...close
}: CloseRow): CashCloseView => ({
  ...close,
  differenceCentavos: close.countedCentavos - close.expectedCentavos,
  closedByName: closedByAccount.staffMember?.name ?? '',
});

// An Assistant closes her own Branches' cash; an Administrator any Branch's.
// Every other Role, the Coordinator included (ADR-0102), is denied.
const requireCashCloser = (
  principal: AuthenticatedPrincipal,
  branchId: string,
) => {
  const { identity } = principal;
  if (
    identity.kind !== 'staff' ||
    (identity.role !== 'assistant' && identity.role !== 'administrator')
  ) {
    throw new BackOfficeError('back_office_access_denied');
  }
  if (identity.role === 'assistant' && !identity.branchIds.includes(branchId)) {
    throw new BackOfficeError('branch_not_assigned');
  }
};

const translate = (error: unknown): never => {
  if (error instanceof BackOfficeError) throw error;
  if (
    databaseCause(error).includes('cash_closes_branch_id_business_date_key')
  ) {
    throw new BackOfficeError('cash_close_already_recorded');
  }
  throw error;
};

const monthStart = (month: string): Date => new Date(`${month}-01T00:00:00Z`);

const nextMonthStart = (start: Date): Date =>
  new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

// BKO-003: the daily Cash Close (back-office/CONTEXT.md).
export const createPrismaCashCloses = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const sumCash = async (
    database: Database,
    branchId: string,
    from: Date,
    until: Date,
  ) => {
    const [total, voided] = await Promise.all([
      database.payment.aggregate({
        where: cashIncome(branchId, from, until),
        _sum: { amountDueCentavos: true },
        _count: { _all: true },
      }),
      database.payment.aggregate({
        where: {
          ...cashIncome(branchId, from, until),
          state: PaymentState.VOIDED,
        },
        _sum: { amountDueCentavos: true },
      }),
    ]);
    return {
      expectedCentavos: total._sum.amountDueCentavos ?? 0,
      cashPaymentCount: total._count._all,
      voidedCashCentavos: voided._sum.amountDueCentavos ?? 0,
    };
  };

  // The expected cash so far today: sales recorded up to this instant.
  const today = async (database: Database, branchId: string) => {
    const now = dependencies.now();
    const businessDate = boliviaDate(now);
    const { from, until } = cashDayWindow(businessDate);
    const cutoff = now < until ? now : until;
    return {
      now,
      businessDate,
      ...(await sumCash(database, branchId, from, cutoff)),
    };
  };

  return {
    readToday: async (
      query: { branchId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<CashToday> => {
      requireCashCloser(principal, query.branchId);
      await requireActiveBranch(prisma, query.branchId);
      const day = await today(prisma, query.branchId);
      const close = await prisma.cashClose.findUnique({
        where: {
          branchId_businessDate: {
            branchId: query.branchId,
            businessDate: day.businessDate,
          },
        },
        select: closeSelect,
      });
      return {
        branchId: query.branchId,
        businessDate: day.businessDate,
        expectedCentavos: day.expectedCentavos,
        cashPaymentCount: day.cashPaymentCount,
        voidedCashCentavos: day.voidedCashCentavos,
        close: close === null ? null : toCloseView(close),
      };
    },

    recordCashClose: async (
      input: { branchId: string; countedCentavos: number; note: string | null },
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ): Promise<CashCloseView> => {
      requireCashCloser(principal, input.branchId);
      const count = requireCashCount(input);
      const response = await runIdempotent(
        prisma,
        {
          accountId: principal.accountId,
          command: 'record_cash_close',
          idempotencyKey,
          request: { branchId: input.branchId, ...count },
          now: dependencies.now,
        },
        async (transaction) => {
          await requireActiveBranch(transaction, input.branchId);
          const day = await today(transaction, input.branchId);
          const created = await transaction.cashClose.create({
            data: {
              branchId: input.branchId,
              businessDate: day.businessDate,
              expectedCentavos: day.expectedCentavos,
              cashPaymentCount: day.cashPaymentCount,
              countedCentavos: count.countedCentavos,
              note: count.note,
              closedByAccountId: principal.accountId,
              closedAt: day.now,
              createdAt: day.now,
            },
            select: closeSelect,
          });
          const close = toCloseView(created);
          const actor = auditActorOf(principal);
          await transaction.auditRecord.create({
            data: {
              actionCode: 'cash_close.recorded',
              outcome: AuditOutcome.SUCCEEDED,
              actorKind: AuditActorKind.ACCOUNT,
              actorAccountId: actor.accountId,
              actorRole: actor.role,
              impersonationId: actor.impersonationId,
              targetType: 'cash_close',
              targetId: close.id,
              branchId: close.branchId,
              correlationId: randomUUID(),
              metadata: {
                businessDate: civilText(close.businessDate),
                expectedCentavos: close.expectedCentavos,
                countedCentavos: close.countedCentavos,
                differenceCentavos: close.differenceCentavos,
              },
              occurredAt: day.now,
            },
          });
          return {
            ...close,
            businessDate: civilText(close.businessDate),
            closedAt: close.closedAt.toISOString(),
          };
        },
      ).catch(translate);
      return {
        ...response,
        businessDate: new Date(`${response.businessDate}T00:00:00Z`),
        closedAt: new Date(response.closedAt),
      };
    },

    // One row per day of the month with cash sales or a close, newest first.
    listCashCloses: async (
      query: { branchId: string; month: string },
      principal: AuthenticatedPrincipal,
    ): Promise<CashCloseHistory> => {
      requireAdministrator(principal);
      const first = monthStart(query.month);
      const now = dependencies.now();
      const todayDate = boliviaDate(now);
      const [payments, closes] = await Promise.all([
        prisma.payment.findMany({
          where: cashIncome(
            query.branchId,
            boliviaInstant(first, 0),
            boliviaInstant(nextMonthStart(first), 0),
          ),
          select: { amountDueCentavos: true, decidedAt: true, state: true },
        }),
        prisma.cashClose.findMany({
          where: {
            branchId: query.branchId,
            businessDate: { gte: first, lt: nextMonthStart(first) },
          },
          select: closeSelect,
        }),
      ]);
      const sales = new Map<
        number,
        { total: number; count: number; voided: number }
      >();
      for (const payment of payments) {
        const key = boliviaDate(payment.decidedAt!).getTime();
        const day = sales.get(key) ?? { total: 0, count: 0, voided: 0 };
        sales.set(key, {
          total: day.total + payment.amountDueCentavos,
          count: day.count + 1,
          voided:
            day.voided +
            (payment.state === PaymentState.VOIDED
              ? payment.amountDueCentavos
              : 0),
        });
      }
      const closesByDay = new Map(
        closes.map((close) => [close.businessDate.getTime(), close]),
      );
      const days = [...new Set([...sales.keys(), ...closesByDay.keys()])]
        .filter((key) => key <= todayDate.getTime())
        .sort((left, right) => right - left)
        .map((key): CashDay => {
          const businessDate = new Date(key);
          const sold = sales.get(key) ?? { total: 0, count: 0, voided: 0 };
          const row = closesByDay.get(key);
          const close = row === undefined ? null : toCloseView(row);
          return {
            businessDate,
            status: cashDayStatus({
              businessDate,
              today: todayDate,
              closed: close !== null,
            }),
            cashSalesCentavos: sold.total,
            cashPaymentCount: sold.count,
            voidedCashCentavos: sold.voided,
            close:
              close === null
                ? null
                : {
                    ...close,
                    adjustmentCentavos: describeCashClose({
                      ...close,
                      currentExpectedCentavos: sold.total,
                    }).adjustmentCentavos,
                  },
          };
        });
      return {
        branchId: query.branchId,
        month: query.month,
        missingDays: days.filter((day) => day.status === 'missing').length,
        days,
      };
    },
  };
};

export type CashCloses = ReturnType<typeof createPrismaCashCloses>;
