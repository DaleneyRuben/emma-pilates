import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError } from '../back-office-errors';
import { requireLeadingTrainer } from './equipment-access';
import { equipmentKindOfClassType, type EquipmentKind } from './equipment-kind';
import {
  equipmentSelect,
  recordIssue,
  sortEquipment,
  toEquipmentView,
  translateEquipmentError,
  type EquipmentView,
  type IssueReport,
} from './equipment-records';
import { recordStockDamage } from './equipment-stock-records';
import {
  equipmentTypeOfClassType,
  type EquipmentTypeView,
} from './equipment-types';
import { listBranchStocks } from './prisma-equipment-stocks';
import { listActiveTypes } from './prisma-equipment-types';

type Database = Prisma.TransactionClient | PrismaClient;

export type SessionEquipmentType = Omit<EquipmentTypeView, 'legacyKind'> & {
  units: EquipmentView[];
  usable: number;
  quantity: number;
};

export type SessionIssueReport =
  | (IssueReport & { equipmentId: string })
  | { typeId: string; quantity: number; description: string };

// Back Office reads the Session it reports from but never writes it (ADR-0011).
const findLedSession = async (
  database: Database,
  sessionId: string,
  principal: AuthenticatedPrincipal,
) => {
  const session = await database.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      branchId: true,
      trainerStaffMemberId: true,
      classType: { select: { name: true } },
    },
  });
  const actor = requireLeadingTrainer(principal, session);
  return { actor, session: session! };
};

const firstWhere = <Item>(items: Item[], first: (item: Item) => boolean) => [
  ...items.filter(first),
  ...items.filter((item) => !first(item)),
];

// BKO-004: a Trainer reports a fault from a Session of her agenda, choosing
// among the Equipment of that Session's Branch. FIX-067: `items` keeps only
// the seeded types' units for old Staff app builds; `types` has every type.
export const createPrismaSessionEquipment = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  // The Session's own kind (and type) comes first; the rest keep type order.
  listSessionEquipment: async (
    input: { sessionId: string },
    principal: AuthenticatedPrincipal,
  ) => {
    const { session } = await findLedSession(
      prisma,
      input.sessionId,
      principal,
    );
    const [types, rows, stocks] = await Promise.all([
      listActiveTypes(prisma),
      prisma.equipment.findMany({
        where: { branchId: session.branchId, archivedAt: null },
        select: equipmentSelect,
      }),
      listBranchStocks(prisma, session.branchId),
    ]);
    const units = sortEquipment(rows).map(toEquipmentView);
    const kind = equipmentKindOfClassType(session.classType.name);
    const type = equipmentTypeOfClassType(session.classType.name, types);
    const seeded = units.filter(
      (unit): unit is EquipmentView & { kind: EquipmentKind } =>
        unit.kind !== null,
    );
    return {
      sessionId: session.id,
      kind,
      typeId: type?.id ?? null,
      items: firstWhere(seeded, (item) => item.kind === kind),
      types: firstWhere(types, (item) => item.id === type?.id).map(
        (item): SessionEquipmentType => {
          const stock = stocks.find((entry) => entry.typeId === item.id);
          return {
            id: item.id,
            name: item.name,
            tracking: item.tracking,
            units: units.filter((unit) => unit.typeId === item.id),
            usable: stock?.usable ?? 0,
            quantity: stock?.quantity ?? 0,
          };
        },
      ),
    };
  },

  reportSessionIssue: async (
    input: SessionIssueReport & { sessionId: string },
    principal: AuthenticatedPrincipal,
  ) =>
    prisma
      .$transaction(async (transaction) => {
        const { actor, session } = await findLedSession(
          transaction,
          input.sessionId,
          principal,
        );
        if ('typeId' in input) {
          return recordStockDamage(
            transaction,
            { ...input, branchId: session.branchId },
            actor,
            dependencies.now(),
          );
        }
        const equipment = await transaction.equipment.findUnique({
          where: { id: input.equipmentId },
          select: { id: true, branchId: true, archivedAt: true },
        });
        if (equipment === null || equipment.branchId !== session.branchId) {
          throw new BackOfficeError('equipment_not_found');
        }
        return recordIssue(
          transaction,
          equipment,
          input,
          actor,
          dependencies.now(),
        );
      })
      .catch(translateEquipmentError),
});

export type SessionEquipment = ReturnType<typeof createPrismaSessionEquipment>;
