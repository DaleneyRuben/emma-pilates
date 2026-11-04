import type { Prisma } from '../../generated/prisma/client';

export const lineKinds = {
  class: 'CLASS',
  minimum_not_met: 'MINIMUM_NOT_MET',
  commission: 'COMMISSION',
  base: 'BASE',
  new_client: 'NEW_CLIENT',
  bonus: 'BONUS',
} as const;

export type LineKind = keyof typeof lineKinds;

export type DraftLine = {
  kind: LineKind;
  detail: string;
  amountCentavos: number;
};

const kindText = (kind: (typeof lineKinds)[LineKind]): LineKind =>
  (Object.entries(lineKinds).find(([, value]) => value === kind)?.[0] ??
    'class') as LineKind;

export const statementSelect = {
  id: true,
  staffMemberId: true,
  month: true,
  periodStart: true,
  periodEnd: true,
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

export type StatementRow = Prisma.PayStatementGetPayload<{
  select: typeof statementSelect;
}>;

export const toView = (row: StatementRow) => ({
  id: row.id,
  staffMemberId: row.staffMemberId,
  staffMemberName: row.staffMember.name,
  month: row.month,
  periodStart: row.periodStart,
  periodEnd: row.periodEnd,
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
export const sameLines = (
  existing: {
    totalCentavos: number;
    lines: { kind: string; detail: string; amountCentavos: number }[];
  },
  input: { totalCentavos: number; lines: DraftLine[] },
): boolean =>
  existing.totalCentavos === input.totalCentavos &&
  existing.lines.length === input.lines.length &&
  existing.lines.every(
    (line, index) =>
      line.kind === lineKinds[input.lines[index].kind] &&
      line.detail === input.lines[index].detail &&
      line.amountCentavos === input.lines[index].amountCentavos,
  );
