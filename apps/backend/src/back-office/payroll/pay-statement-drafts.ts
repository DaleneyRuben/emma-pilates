import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { BackOfficeError, databaseCause } from '../back-office-errors';
import { civilText, monthOf, type PayPeriod } from './pay-period';
import { lineKinds, sameLines, type DraftLine } from './pay-statement-rows';

type Transaction = Prisma.TransactionClient;

// Who drafts decides what an overlapping draft means (ADR-0109). The
// Administrator's period replaces the drafts it overlaps; the hourly worker
// only keeps its own whole month and leaves a Staff Member alone once any
// other period of that month holds a statement.
export type DraftMode = 'administrator' | 'worker';

export type DraftOutcome = 'drafted' | 'unchanged' | 'skipped';

// Two live statements of one Staff Member never overlap: the database refuses
// it (23P01) when two drafts race past the row locks below.
export const rethrowPeriodOverlap = (error: unknown): never => {
  if (
    databaseCause(error).includes(
      'pay_statements_staff_member_period_no_overlap',
    )
  ) {
    throw new BackOfficeError('pay_statement_period_overlaps');
  }
  throw error;
};

const withdraw = async (
  transaction: Transaction,
  statementId: string,
  now: Date,
) => {
  await transaction.payStatementLine.updateMany({
    where: { payStatementId: statementId, deletedAt: null },
    data: { deletedAt: now },
  });
  await transaction.payStatement.update({
    where: { id: statementId },
    data: { deletedAt: now, updatedAt: now },
  });
};

export const replaceDraft = async (
  transaction: Transaction,
  input: {
    staffMemberId: string;
    period: PayPeriod;
    mode: DraftMode;
    lines: DraftLine[];
    totalCentavos: number;
    now: Date;
  },
): Promise<DraftOutcome> => {
  const from = civilText(input.period.from);
  const until = civilText(input.period.until);
  // The row locks serialize a re-draft with an approval of the same
  // statements (H11): whichever comes second sees the other's result.
  const overlapping = await transaction.$queryRaw<
    { id: string; state: string; from: string; until: string }[]
  >`
    SELECT "id", "state"::text AS "state",
           "period_start"::text AS "from", "period_end"::text AS "until"
      FROM "back_office"."pay_statements"
     WHERE "staff_member_id" = ${input.staffMemberId}::uuid
       AND "deleted_at" IS NULL
       AND daterange("period_start", "period_end", '[)')
           && daterange(${from}::date, ${until}::date, '[)')
     ORDER BY "period_start"
       FOR UPDATE`;
  if (overlapping.some((row) => row.state === 'approved')) return 'skipped';
  const exact = overlapping.find(
    (row) => row.from === from && row.until === until,
  );
  if (input.mode === 'worker' && overlapping.some((row) => row !== exact)) {
    return 'skipped';
  }
  if (exact !== undefined && overlapping.length === 1) {
    const existing = await transaction.payStatement.findUniqueOrThrow({
      where: { id: exact.id },
      select: {
        totalCentavos: true,
        lines: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: { kind: true, detail: true, amountCentavos: true },
        },
      },
    });
    if (sameLines(existing, input)) return 'unchanged';
  }
  for (const row of overlapping) {
    await withdraw(transaction, row.id, input.now);
  }
  await transaction.payStatement
    .create({
      data: {
        id: randomUUID(),
        staffMemberId: input.staffMemberId,
        month: monthOf(input.period.from),
        periodStart: input.period.from,
        periodEnd: input.period.until,
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
    })
    .catch(rethrowPeriodOverlap);
  return 'drafted';
};

// A draft of exactly this period whose lines are gone (a voided commission, a
// deactivated Coordinator) is withdrawn, so no stale amount stays approvable.
export const withdrawStaleDrafts = async (
  prisma: PrismaClient,
  input: {
    period: PayPeriod;
    current: Set<string>;
    roles: ('TRAINER' | 'COORDINATOR')[];
    now: Date;
  },
) => {
  const stale = await prisma.payStatement.findMany({
    where: {
      periodStart: input.period.from,
      periodEnd: input.period.until,
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
