import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { EquipmentKind as PrismaEquipmentKind } from '../../generated/prisma/enums';
import {
  BackOfficeError,
  databaseCause,
  type BackOfficeActor,
} from '../back-office-errors';
import type { EquipmentKind } from './equipment-kind';
import { compareEquipmentTypes } from './equipment-types';

type Database = Prisma.TransactionClient | PrismaClient;

export type EquipmentStatus = 'working' | 'faulty' | 'out_of_service';

export type EquipmentView = {
  id: string;
  branchId: string;
  typeId: string;
  typeName: string;
  /** Deprecated (FIX-067): the seeded types' kind, null for a studio type. */
  kind: EquipmentKind | null;
  number: number;
  status: EquipmentStatus;
  openIssueCount: number;
  archivedAt: Date | null;
};

// A fault on a numbered unit, or damage to some of a Branch's stock of a
// quantity type (FIX-067): then the unit fields are null and quantity is set.
export type EquipmentIssueView = {
  id: string;
  equipmentId: string | null;
  equipmentKind: EquipmentKind | null;
  equipmentNumber: number | null;
  typeId: string;
  typeName: string;
  quantity: number | null;
  writtenOff: boolean;
  description: string;
  outOfService: boolean;
  reportedAt: Date;
  reportedByName: string;
  resolvedAt: Date | null;
  resolvedByName: string | null;
};

export type IssueReport = { description: string; outOfService: boolean };

export const toKind = (kind: PrismaEquipmentKind): EquipmentKind =>
  kind.toLowerCase() as EquipmentKind;

const toKindOrNull = (kind: PrismaEquipmentKind | null) =>
  kind === null ? null : toKind(kind);

const typeSelect = {
  select: { id: true, name: true, legacyKind: true },
} as const;

export const toPrismaKind = (kind: EquipmentKind): PrismaEquipmentKind =>
  PrismaEquipmentKind[kind.toUpperCase() as keyof typeof PrismaEquipmentKind];

export const equipmentSelect = {
  id: true,
  branchId: true,
  kind: true,
  number: true,
  type: typeSelect,
  archivedAt: true,
  issues: { where: { resolvedAt: null }, select: { outOfService: true } },
} satisfies Prisma.EquipmentSelect;

type EquipmentRow = Prisma.EquipmentGetPayload<{
  select: typeof equipmentSelect;
}>;

// The state is derived from the open Issues, never stored (ADR-0106).
export const toEquipmentView = (row: EquipmentRow): EquipmentView => ({
  id: row.id,
  branchId: row.branchId,
  typeId: row.type.id,
  typeName: row.type.name,
  kind: toKindOrNull(row.kind),
  number: row.number,
  archivedAt: row.archivedAt,
  openIssueCount: row.issues.length,
  status: row.issues.some((issue) => issue.outOfService)
    ? 'out_of_service'
    : row.issues.length > 0
      ? 'faulty'
      : 'working',
});

type OrderedEquipment = {
  number: number;
  type: { id: string; name: string; legacyKind: PrismaEquipmentKind | null };
};

// Type order (the seeded types first, then by name), then by number.
export const sortEquipment = <Row extends OrderedEquipment>(
  rows: readonly Row[],
): Row[] =>
  [...rows].sort(
    (first, second) =>
      compareEquipmentTypes(
        { ...first.type, legacyKind: toKindOrNull(first.type.legacyKind) },
        { ...second.type, legacyKind: toKindOrNull(second.type.legacyKind) },
      ) || first.number - second.number,
  );

const authorSelect = {
  select: { staffMember: { select: { name: true } } },
} as const;

export const issueSelect = {
  id: true,
  equipmentId: true,
  description: true,
  outOfService: true,
  reportedAt: true,
  resolvedAt: true,
  quantity: true,
  writtenOff: true,
  equipment: { select: { kind: true, number: true, type: typeSelect } },
  stock: { select: { type: typeSelect } },
  reportedByAccount: authorSelect,
  resolvedByAccount: authorSelect,
} satisfies Prisma.EquipmentIssueSelect;

type IssueRow = Prisma.EquipmentIssueGetPayload<{
  select: typeof issueSelect;
}>;

export const toIssueView = (row: IssueRow): EquipmentIssueView => {
  const type = (row.equipment?.type ?? row.stock?.type)!;
  return {
    id: row.id,
    equipmentId: row.equipmentId,
    equipmentKind: toKindOrNull(row.equipment?.kind ?? null),
    equipmentNumber: row.equipment?.number ?? null,
    typeId: type.id,
    typeName: type.name,
    quantity: row.quantity,
    writtenOff: row.writtenOff,
    description: row.description,
    outOfService: row.outOfService,
    reportedAt: row.reportedAt,
    reportedByName: row.reportedByAccount.staffMember?.name ?? '',
    resolvedAt: row.resolvedAt,
    resolvedByName:
      row.resolvedByAccount === null
        ? null
        : (row.resolvedByAccount.staffMember?.name ?? ''),
  };
};

export const translateEquipmentError = (error: unknown): never => {
  if (error instanceof BackOfficeError) throw error;
  const cause = databaseCause(error);
  if (cause.includes('equipment_branch_type_active_number_key')) {
    throw new BackOfficeError('equipment_number_taken');
  }
  if (cause.includes('equipment_types_active_name_key')) {
    throw new BackOfficeError('equipment_type_name_taken');
  }
  if (cause.includes('equipment needs a unit type')) {
    throw new BackOfficeError('equipment_type_not_unit');
  }
  if (cause.includes('equipment type is archived')) {
    throw new BackOfficeError('equipment_type_not_found');
  }
  if (cause.includes('equipment issue resolution is final')) {
    throw new BackOfficeError('equipment_issue_resolved');
  }
  if (cause.includes('violates check constraint') || cause.includes('23514')) {
    throw new BackOfficeError('invalid_back_office_value');
  }
  throw error;
};

const maximumDescription = 500;

export const cleanDescription = (value: string): string => {
  const description = value.trim();
  if (description === '' || description.length > maximumDescription) {
    throw new BackOfficeError('invalid_back_office_value');
  }
  return description;
};

// Records a fault on a piece of Equipment that must still be in service.
export const recordIssue = async (
  database: Database,
  equipment: { id: string; archivedAt: Date | null },
  report: IssueReport,
  actor: BackOfficeActor,
  now: Date,
): Promise<EquipmentIssueView> => {
  if (equipment.archivedAt !== null) {
    throw new BackOfficeError('equipment_archived');
  }
  const description = cleanDescription(report.description);
  const issue = await database.equipmentIssue.create({
    data: {
      equipmentId: equipment.id,
      description,
      outOfService: report.outOfService,
      reportedByAccountId: actor.accountId,
      reportedAt: now,
    },
    select: issueSelect,
  });
  return toIssueView(issue);
};
