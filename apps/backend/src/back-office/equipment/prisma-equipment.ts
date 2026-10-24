import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError } from '../back-office-errors';
import { requireActiveBranch } from '../booking-references';
import { requireEquipmentManager } from './equipment-access';
import { equipmentKindOfClassType, type EquipmentKind } from './equipment-kind';
import {
  equipmentOrder,
  equipmentSelect,
  issueSelect,
  recordIssue,
  toEquipmentView,
  toIssueView,
  toKind,
  toPrismaKind,
  translateEquipmentError,
  type IssueReport,
} from './equipment-records';

export type {
  EquipmentIssueView,
  EquipmentStatus,
  EquipmentView,
} from './equipment-records';

export type EquipmentIssueStatus = 'open' | 'resolved';

export type FlaggedSession = {
  sessionId: string;
  kind: EquipmentKind;
  capacity: number;
  workingCount: number;
};

type Paging = { page: number; pageSize: number };

const issueOrders: Record<
  EquipmentIssueStatus,
  Prisma.EquipmentIssueOrderByWithRelationInput[]
> = {
  open: [{ reportedAt: 'desc' }, { id: 'desc' }],
  resolved: [{ resolvedAt: 'desc' }, { id: 'desc' }],
};

const isEquipmentNumber = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 99;

const count = (values: readonly EquipmentKind[]) =>
  values.reduce(
    (totals, kind) => totals.set(kind, (totals.get(kind) ?? 0) + 1),
    new Map<EquipmentKind, number>(),
  );

// BKO-004 (ADR-0106): the Administrator's Equipment list, its faults, and the
// Sessions with more places than working Equipment of their kind.
export const createPrismaEquipment = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const findEquipment = async (
    database: Prisma.TransactionClient | PrismaClient,
    equipmentId: string,
  ) => {
    const equipment = await database.equipment.findUnique({
      where: { id: equipmentId },
      select: equipmentSelect,
    });
    if (equipment === null) throw new BackOfficeError('equipment_not_found');
    return equipment;
  };

  return {
    listEquipment: async (
      query: { branchId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireEquipmentManager(principal);
      const rows = await prisma.equipment.findMany({
        where: { branchId: query.branchId, archivedAt: null },
        orderBy: equipmentOrder,
        select: equipmentSelect,
      });
      return { items: rows.map(toEquipmentView) };
    },

    createEquipment: async (
      input: { branchId: string; kind: EquipmentKind; number: number },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireEquipmentManager(principal);
      if (!isEquipmentNumber(input.number)) {
        throw new BackOfficeError('invalid_back_office_value');
      }
      const now = dependencies.now();
      return prisma
        .$transaction(async (transaction) => {
          await requireActiveBranch(transaction, input.branchId);
          return transaction.equipment.create({
            data: {
              branchId: input.branchId,
              kind: toPrismaKind(input.kind),
              number: input.number,
              createdByAccountId: actor.accountId,
              createdAt: now,
              updatedAt: now,
            },
            select: equipmentSelect,
          });
        })
        .then(toEquipmentView, translateEquipmentError);
    },

    // One-way: a retired piece leaves the list and the counts, and keeps its
    // Issues. Retiring it again changes nothing.
    archiveEquipment: async (
      input: { equipmentId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireEquipmentManager(principal);
      return prisma
        .$transaction(async (transaction) => {
          const equipment = await findEquipment(transaction, input.equipmentId);
          if (equipment.archivedAt !== null) return equipment;
          const now = dependencies.now();
          return transaction.equipment.update({
            where: { id: equipment.id },
            data: { archivedAt: now, updatedAt: now },
            select: equipmentSelect,
          });
        })
        .then(toEquipmentView, translateEquipmentError);
    },

    reportIssue: async (
      input: IssueReport & { equipmentId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireEquipmentManager(principal);
      return prisma
        .$transaction(async (transaction) =>
          recordIssue(
            transaction,
            await findEquipment(transaction, input.equipmentId),
            input,
            actor,
            dependencies.now(),
          ),
        )
        .catch(translateEquipmentError);
    },

    resolveIssue: async (
      input: { issueId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireEquipmentManager(principal);
      return prisma
        .$transaction(async (transaction) => {
          const { count: resolved } =
            await transaction.equipmentIssue.updateMany({
              where: { id: input.issueId, resolvedAt: null },
              data: {
                resolvedAt: dependencies.now(),
                resolvedByAccountId: actor.accountId,
              },
            });
          const issue = await transaction.equipmentIssue.findUnique({
            where: { id: input.issueId },
            select: issueSelect,
          });
          if (issue === null) {
            throw new BackOfficeError('equipment_issue_not_found');
          }
          if (resolved === 0) {
            throw new BackOfficeError('equipment_issue_resolved');
          }
          return toIssueView(issue);
        })
        .catch(translateEquipmentError);
    },

    // A retired machine's open faults no longer need anyone's attention.
    listIssues: async (
      query: Paging & { branchId: string; status: EquipmentIssueStatus },
      principal: AuthenticatedPrincipal,
    ) => {
      requireEquipmentManager(principal);
      const where: Prisma.EquipmentIssueWhereInput =
        query.status === 'open'
          ? {
              resolvedAt: null,
              equipment: { branchId: query.branchId, archivedAt: null },
            }
          : {
              resolvedAt: { not: null },
              equipment: { branchId: query.branchId },
            };
      const [rows, totalItems] = await Promise.all([
        prisma.equipmentIssue.findMany({
          where,
          orderBy: issueOrders[query.status],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: issueSelect,
        }),
        prisma.equipmentIssue.count({ where }),
      ]);
      return {
        items: rows.map(toIssueView),
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
      };
    },

    // Future, scheduled Sessions in [from, until) whose capacity exceeds the
    // working Equipment of their kind at the Branch. A kind the Branch has no
    // Equipment of is not checked; the capacity is never changed here.
    listFlaggedSessions: async (
      query: { branchId: string; from: Date; until: Date },
      principal: AuthenticatedPrincipal,
    ): Promise<FlaggedSession[]> => {
      requireEquipmentManager(principal);
      const [equipment, sessions] = await Promise.all([
        prisma.equipment.findMany({
          where: { branchId: query.branchId, archivedAt: null },
          select: {
            kind: true,
            issues: {
              where: { resolvedAt: null, outOfService: true },
              select: { id: true },
              take: 1,
            },
          },
        }),
        prisma.session.findMany({
          where: {
            branchId: query.branchId,
            state: 'SCHEDULED',
            startsAt: {
              gte: query.from,
              lt: query.until,
              gt: dependencies.now(),
            },
          },
          orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            capacity: true,
            classType: { select: { name: true } },
          },
        }),
      ]);
      const registered = count(equipment.map((row) => toKind(row.kind)));
      const working = count(
        equipment
          .filter((row) => row.issues.length === 0)
          .map((row) => toKind(row.kind)),
      );
      return sessions.flatMap((session) => {
        const kind = equipmentKindOfClassType(session.classType.name);
        if (kind === null || !registered.has(kind)) return [];
        const workingCount = working.get(kind) ?? 0;
        if (session.capacity <= workingCount) return [];
        return [
          {
            sessionId: session.id,
            kind,
            capacity: session.capacity,
            workingCount,
          },
        ];
      });
    },
  };
};

export type EquipmentOperations = ReturnType<typeof createPrismaEquipment>;
