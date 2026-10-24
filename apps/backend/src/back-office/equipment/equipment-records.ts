import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { EquipmentKind as PrismaEquipmentKind } from '../../generated/prisma/enums';
import {
  BackOfficeError,
  databaseCause,
  type BackOfficeActor,
} from '../back-office-errors';
import type { EquipmentKind } from './equipment-kind';

type Database = Prisma.TransactionClient | PrismaClient;

export type EquipmentStatus = 'working' | 'faulty' | 'out_of_service';

export type EquipmentView = {
  id: string;
  branchId: string;
  kind: EquipmentKind;
  number: number;
  status: EquipmentStatus;
  openIssueCount: number;
  archivedAt: Date | null;
};

export type EquipmentIssueView = {
  id: string;
  equipmentId: string;
  equipmentKind: EquipmentKind;
  equipmentNumber: number;
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

export const toPrismaKind = (kind: EquipmentKind): PrismaEquipmentKind =>
  PrismaEquipmentKind[kind.toUpperCase() as keyof typeof PrismaEquipmentKind];

export const equipmentSelect = {
  id: true,
  branchId: true,
  kind: true,
  number: true,
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
  kind: toKind(row.kind),
  number: row.number,
  archivedAt: row.archivedAt,
  openIssueCount: row.issues.length,
  status: row.issues.some((issue) => issue.outOfService)
    ? 'out_of_service'
    : row.issues.length > 0
      ? 'faulty'
      : 'working',
});

// Enum declaration order: reformers, cadillacs, mats; then by number.
export const equipmentOrder = [
  { kind: 'asc' },
  { number: 'asc' },
] satisfies Prisma.EquipmentOrderByWithRelationInput[];

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
  equipment: { select: { kind: true, number: true } },
  reportedByAccount: authorSelect,
  resolvedByAccount: authorSelect,
} satisfies Prisma.EquipmentIssueSelect;

type IssueRow = Prisma.EquipmentIssueGetPayload<{
  select: typeof issueSelect;
}>;

export const toIssueView = (row: IssueRow): EquipmentIssueView => ({
  id: row.id,
  equipmentId: row.equipmentId,
  equipmentKind: toKind(row.equipment.kind),
  equipmentNumber: row.equipment.number,
  description: row.description,
  outOfService: row.outOfService,
  reportedAt: row.reportedAt,
  reportedByName: row.reportedByAccount.staffMember?.name ?? '',
  resolvedAt: row.resolvedAt,
  resolvedByName:
    row.resolvedByAccount === null
      ? null
      : (row.resolvedByAccount.staffMember?.name ?? ''),
});

export const translateEquipmentError = (error: unknown): never => {
  if (error instanceof BackOfficeError) throw error;
  const cause = databaseCause(error);
  if (cause.includes('equipment_branch_kind_active_number_key')) {
    throw new BackOfficeError('equipment_number_taken');
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
  const description = report.description.trim();
  if (description === '' || description.length > maximumDescription) {
    throw new BackOfficeError('invalid_back_office_value');
  }
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
