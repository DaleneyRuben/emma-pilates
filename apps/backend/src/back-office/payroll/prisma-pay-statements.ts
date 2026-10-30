import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  addCivilDays,
  boliviaDate,
  boliviaInstant,
} from '../../time/bolivia-time';
import {
  BackOfficeError,
  requireAdministrator,
  type BackOfficeActor,
} from '../back-office-errors';
import { recordBackOfficeAudit } from '../prisma-audit';
import { coordinatorPay } from './coordinator-pay';
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

type Transaction = Prisma.TransactionClient;

const monthStart = (month: Date) =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));

const monthEnd = (month: Date) =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));

const lineKinds = {
  class: 'CLASS',
  minimum_not_met: 'MINIMUM_NOT_MET',
  commission: 'COMMISSION',
  base: 'BASE',
  new_client: 'NEW_CLIENT',
  bonus: 'BONUS',
} as const;

type LineKind = keyof typeof lineKinds;

const kindText = (kind: (typeof lineKinds)[LineKind]): LineKind =>
  (Object.entries(lineKinds).find(([, value]) => value === kind)?.[0] ??
    'class') as LineKind;

const statementSelect = {
  id: true,
  staffMemberId: true,
  month: true,
  state: true,
  totalCentavos: true,
  salaryPaymentId: true,
  staffMember: { select: { name: true, role: true } },
  lines: {
    where: { deletedAt: null },
    orderBy: { position: 'asc' as const },
    select: { kind: true, detail: true, amountCentavos: true },
  },
} satisfies Prisma.PayStatementSelect;

type StatementRow = Prisma.PayStatementGetPayload<{
  select: typeof statementSelect;
}>;

const toView = (row: StatementRow) => ({
  id: row.id,
  staffMemberId: row.staffMemberId,
  staffMemberName: row.staffMember.name,
  month: row.month,
  state: row.state === 'APPROVED' ? ('approved' as const) : ('draft' as const),
  totalCentavos: row.totalCentavos,
  salaryPaymentId: row.salaryPaymentId,
  lines: row.lines.map((line) => ({
    kind: kindText(line.kind),
    detail: line.detail,
    amountCentavos: line.amountCentavos,
  })),
});

// The draft is unchanged when it holds the same lines in the same order and
// the same total: the hourly re-draft then writes nothing.
const sameLines = (
  existing: {
    totalCentavos: number;
    lines: { kind: string; detail: string; amountCentavos: number }[];
  },
  input: {
    totalCentavos: number;
    lines: { kind: LineKind; detail: string; amountCentavos: number }[];
  },
): boolean =>
  existing.totalCentavos === input.totalCentavos &&
  existing.lines.length === input.lines.length &&
  existing.lines.every(
    (line, index) =>
      line.kind === lineKinds[input.lines[index].kind] &&
      line.detail === input.lines[index].detail &&
      line.amountCentavos === input.lines[index].amountCentavos,
  );

// A month's pay is approved once it is over in Bolivia. The Coordinator's
// renewal bonus counts purchases up to 7 days after the month's last Plans
// end, so hers waits those 7 days too.
const approvableFrom = (statement: {
  month: Date;
  staffMember: { role: string };
}): Date => {
  const end = monthEnd(statement.month);
  return boliviaInstant(
    statement.staffMember.role === 'COORDINATOR' ? addCivilDays(end, 7) : end,
    0,
  );
};

const requireTrainer = (principal: AuthenticatedPrincipal): string => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'trainer'
  ) {
    throw new BackOfficeError('back_office_access_denied');
  }
  return principal.identity.staffMemberId;
};

// BKO-006: the worker drafts; the Administrator approves, which creates the
// Salary Payment. A Trainer reads only her own. Anyone else, including a
// Coordinator the Role does not wire yet, is denied.
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
  const draftMonth = async (month: Date) => {
    const from = monthStart(month);
    const facts = await dependencies.factsOfMonth(from, monthEnd(from));
    const now = dependencies.now();
    let drafted = 0;
    const current = new Set<string>();
    for (const trainer of facts.trainers) {
      const pay = trainerPay(facts.rates, trainer);
      if (pay.lines.length === 0) continue;
      current.add(trainer.staffMemberId);
      await prisma.$transaction((transaction) =>
        replaceDraft(transaction, {
          staffMemberId: trainer.staffMemberId,
          month: from,
          lines: pay.lines,
          totalCentavos: pay.totalCentavos,
          now,
        }),
      );
      drafted += 1;
    }
    const coordinatorFacts = dependencies.coordinatorFactsOfMonth
      ? await dependencies.coordinatorFactsOfMonth(from, monthEnd(from))
      : null;
    for (const staffMemberId of coordinatorFacts?.staffMemberIds ?? []) {
      current.add(staffMemberId);
      const pay = coordinatorPay(coordinatorFacts!);
      await prisma.$transaction((transaction) =>
        replaceDraft(transaction, {
          staffMemberId,
          month: from,
          lines: pay.lines,
          totalCentavos: pay.totalCentavos,
          now,
        }),
      );
      drafted += 1;
    }
    await withdrawStaleDrafts({
      month: from,
      current,
      roles:
        coordinatorFacts === null ? ['TRAINER'] : ['TRAINER', 'COORDINATOR'],
      now,
    });
    return { drafted };
  };

  // A draft whose lines are gone (a voided commission, a deactivated
  // Coordinator) is withdrawn, so no stale amount stays approvable.
  const withdrawStaleDrafts = async (input: {
    month: Date;
    current: Set<string>;
    roles: ('TRAINER' | 'COORDINATOR')[];
    now: Date;
  }) => {
    const stale = await prisma.payStatement.findMany({
      where: {
        month: input.month,
        state: 'DRAFT',
        deletedAt: null,
        staffMemberId: { notIn: [...input.current] },
        staffMember: { role: { in: input.roles } },
      },
      select: { id: true },
    });
    for (const statement of stale) {
      await prisma.$transaction(async (transaction) => {
        const withdrawn = await transaction.payStatement.updateMany({
          where: { id: statement.id, state: 'DRAFT', deletedAt: null },
          data: { deletedAt: input.now, updatedAt: input.now },
        });
        if (withdrawn.count === 0) return;
        await transaction.payStatementLine.updateMany({
          where: { payStatementId: statement.id, deletedAt: null },
          data: { deletedAt: input.now },
        });
      });
    }
  };

  const replaceDraft = async (
    transaction: Transaction,
    input: {
      staffMemberId: string;
      month: Date;
      lines: {
        kind: LineKind;
        detail: string;
        amountCentavos: number;
      }[];
      totalCentavos: number;
      now: Date;
    },
  ) => {
    // The row lock serializes a re-draft with an approval of the same
    // statement (H11): whichever comes second sees the other's result.
    const locked = await transaction.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "back_office"."pay_statements"
       WHERE "staff_member_id" = ${input.staffMemberId}::uuid
         AND "month" = ${input.month.toISOString().slice(0, 10)}::date
         AND "deleted_at" IS NULL
       FOR UPDATE`;
    const existing =
      locked.length === 0
        ? null
        : await transaction.payStatement.findUniqueOrThrow({
            where: { id: locked[0].id },
            select: {
              id: true,
              state: true,
              totalCentavos: true,
              lines: {
                where: { deletedAt: null },
                orderBy: { position: 'asc' },
                select: { kind: true, detail: true, amountCentavos: true },
              },
            },
          });
    if (existing?.state === 'APPROVED') return existing.id;
    if (existing !== null && sameLines(existing, input)) return existing.id;
    if (existing !== null) {
      await transaction.payStatementLine.updateMany({
        where: { payStatementId: existing.id, deletedAt: null },
        data: { deletedAt: input.now },
      });
      await transaction.payStatement.update({
        where: { id: existing.id },
        data: { deletedAt: input.now, updatedAt: input.now },
      });
    }
    const created = await transaction.payStatement.create({
      data: {
        id: randomUUID(),
        staffMemberId: input.staffMemberId,
        month: input.month,
        totalCentavos: input.totalCentavos,
        createdAt: input.now,
        updatedAt: input.now,
        lines: {
          create: input.lines.map((line, position) => ({
            id: randomUUID(),
            kind: lineKinds[line.kind],
            detail: line.detail,
            amountCentavos: line.amountCentavos,
            position,
            createdAt: input.now,
          })),
        },
      },
      select: { id: true },
    });
    return created.id;
  };

  return {
    draftMonth,

    // The same draft, refused to anyone but the Administrator. The worker
    // calls draftMonth directly because it has no Account.
    draftMonthAsAdministrator: async (
      month: Date,
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      return draftMonth(month);
    },

    listStatements: async (
      query: { month: Date },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const rows = await prisma.payStatement.findMany({
        where: { month: monthStart(query.month), deletedAt: null },
        orderBy: { staffMember: { name: 'asc' } },
        select: statementSelect,
      });
      return rows.map(toView);
    },

    listOwnStatements: async (principal: AuthenticatedPrincipal) => {
      const staffMemberId = requireTrainer(principal);
      const rows = await prisma.payStatement.findMany({
        where: { staffMemberId, deletedAt: null },
        orderBy: { month: 'desc' },
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
