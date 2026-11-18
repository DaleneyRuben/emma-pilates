import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { EquipmentTracking } from '../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError } from '../back-office-errors';
import { requireActiveBranch } from '../booking-references';
import { requireEquipmentManager } from './equipment-access';
import type { EquipmentKind } from './equipment-kind';
import {
  equipmentSelect,
  issueSelect,
  recordIssue,
  sortEquipment,
  toEquipmentView,
  toIssueView,
  toPrismaKind,
  translateEquipmentError,
  type IssueReport,
} from './equipment-records';
import { lockActiveType } from './equipment-stock-records';
import { equipmentTypeOfClassType } from './equipment-types';
import { listActiveTypes } from './prisma-equipment-types';

export type {
  EquipmentIssueView,
  EquipmentStatus,
  EquipmentView,
} from './equipment-records';

export type EquipmentIssueStatus = 'open' | 'resolved';

export type FlaggedSession = {
  sessionId: string;
  typeId: string;
  typeName: string;
  /** Deprecated (FIX-067): null for a studio type. */
  kind: EquipmentKind | null;
  capacity: number;
  workingCount: number;
};

// A unit is named by its type, or by the old kind (one of the seeded types).
export type EquipmentInput = { branchId: string; number: number } & (
  | { typeId: string; kind?: undefined }
  | { kind: EquipmentKind; typeId?: undefined }
);

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

const count = (values: readonly string[]) =>
  values.reduce(
    (totals, typeId) => totals.set(typeId, (totals.get(typeId) ?? 0) + 1),
    new Map<string, number>(),
  );

// The unit type a new unit belongs to, held against a concurrent archive.
const lockUnitType = async (
  transaction: Prisma.TransactionClient,
  input: EquipmentInput,
) => {
  const typeId =
    input.typeId ??
    (
      await transaction.equipmentType.findFirst({
        where: { legacyKind: toPrismaKind(input.kind), archivedAt: null },
        select: { id: true },
      })
    )?.id;
  if (typeId === undefined) {
    throw new BackOfficeError('equipment_type_not_found');
  }
  const type = await lockActiveType(transaction, typeId);
  if (type.tracking !== EquipmentTracking.UNIT) {
    throw new BackOfficeError('equipment_type_not_unit');
  }
  return type;
};

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
        select: equipmentSelect,
      });
      return { items: sortEquipment(rows).map(toEquipmentView) };
    },

    createEquipment: async (
      input: EquipmentInput,
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
          const type = await lockUnitType(transaction, input);
          return transaction.equipment.create({
            data: {
              branchId: input.branchId,
              typeId: type.id,
              kind: type.legacyKind,
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

    // A retired machine's open faults no longer need anyone's attention; open
    // damage on the Branch's stock is listed with them (FIX-067).
    listIssues: async (
      query: Paging & { branchId: string; status: EquipmentIssueStatus },
      principal: AuthenticatedPrincipal,
    ) => {
      requireEquipmentManager(principal);
      const where: Prisma.EquipmentIssueWhereInput =
        query.status === 'open'
          ? {
              resolvedAt: null,
              OR: [
                { equipment: { branchId: query.branchId, archivedAt: null } },
                { stock: { branchId: query.branchId } },
              ],
            }
          : {
              resolvedAt: { not: null },
              OR: [
                { equipment: { branchId: query.branchId } },
                { stock: { branchId: query.branchId } },
              ],
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
    // working Equipment of their unit type at the Branch (FIX-067: the first
    // unit type whose name is in the Class Type's). A type the Branch has no
    // Equipment of is not checked; the capacity is never changed here.
    listFlaggedSessions: async (
      query: { branchId: string; from: Date; until: Date },
      principal: AuthenticatedPrincipal,
    ): Promise<FlaggedSession[]> => {
      requireEquipmentManager(principal);
      const [types, equipment, sessions] = await Promise.all([
        listActiveTypes(prisma),
        prisma.equipment.findMany({
          where: { branchId: query.branchId, archivedAt: null },
          select: {
            typeId: true,
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
      const registered = count(equipment.map((row) => row.typeId));
      const working = count(
        equipment
          .filter((row) => row.issues.length === 0)
          .map((row) => row.typeId),
      );
      return sessions.flatMap((session) => {
        const type = equipmentTypeOfClassType(session.classType.name, types);
        if (type === null || !registered.has(type.id)) return [];
        const workingCount = working.get(type.id) ?? 0;
        if (session.capacity <= workingCount) return [];
        return [
          {
            sessionId: session.id,
            typeId: type.id,
            typeName: type.name,
            kind: type.legacyKind,
            capacity: session.capacity,
            workingCount,
          },
        ];
      });
    },
  };
};

export type EquipmentOperations = ReturnType<typeof createPrismaEquipment>;
