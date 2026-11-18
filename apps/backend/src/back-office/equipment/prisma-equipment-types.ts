import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { EquipmentTracking as PrismaTracking } from '../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError, requireAdministrator } from '../back-office-errors';
import { requireActiveBranch } from '../booking-references';
import { requireEquipmentManager } from './equipment-access';
import { toKind, translateEquipmentError } from './equipment-records';
import { lockActiveType, writeStockQuantity } from './equipment-stock-records';
import {
  compareEquipmentTypes,
  type EquipmentTracking,
  type EquipmentTypeView,
} from './equipment-types';

export const equipmentTypeSelect = {
  id: true,
  name: true,
  tracking: true,
  legacyKind: true,
} satisfies Prisma.EquipmentTypeSelect;

type TypeRow = Prisma.EquipmentTypeGetPayload<{
  select: typeof equipmentTypeSelect;
}>;

export const toTypeView = (row: TypeRow): EquipmentTypeView => ({
  id: row.id,
  name: row.name,
  tracking: row.tracking === PrismaTracking.QUANTITY ? 'quantity' : 'unit',
  legacyKind: row.legacyKind === null ? null : toKind(row.legacyKind),
});

const toPrismaTracking = (tracking: EquipmentTracking) =>
  tracking === 'quantity' ? PrismaTracking.QUANTITY : PrismaTracking.UNIT;

// Every type not archived, in type order.
export const listActiveTypes = async (
  database: Prisma.TransactionClient | PrismaClient,
): Promise<EquipmentTypeView[]> =>
  (
    await database.equipmentType.findMany({
      where: { archivedAt: null },
      select: equipmentTypeSelect,
    })
  )
    .map(toTypeView)
    .sort(compareEquipmentTypes);

const maximumName = 40;

const cleanName = (value: string): string => {
  const name = value.trim();
  if (name === '' || name.length > maximumName) {
    throw new BackOfficeError('invalid_back_office_value');
  }
  return name;
};

export type EquipmentTypeInput = {
  name: string;
  tracking: EquipmentTracking;
  branchId?: string;
  quantity?: number;
};

// FIX-067: the studio's Equipment Types. The Administrator keeps the catalog;
// the Coordinator, who runs the units and counts, reads it.
export const createPrismaEquipmentTypes = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  listTypes: async (principal: AuthenticatedPrincipal) => {
    requireEquipmentManager(principal);
    return { items: await listActiveTypes(prisma) };
  },

  // A quantity type may start with a Branch's count.
  createType: async (
    input: EquipmentTypeInput,
    principal: AuthenticatedPrincipal,
  ): Promise<EquipmentTypeView> => {
    const actor = requireAdministrator(principal);
    const name = cleanName(input.name);
    const withStock = input.quantity !== undefined;
    if (
      withStock !== (input.branchId !== undefined) ||
      (withStock && input.tracking !== 'quantity')
    ) {
      throw new BackOfficeError('invalid_back_office_value');
    }
    const now = dependencies.now();
    return prisma
      .$transaction(async (transaction) => {
        if (input.branchId !== undefined) {
          await requireActiveBranch(transaction, input.branchId);
        }
        const type = await transaction.equipmentType.create({
          data: {
            name,
            tracking: toPrismaTracking(input.tracking),
            createdByAccountId: actor.accountId,
            createdAt: now,
            updatedAt: now,
          },
          select: equipmentTypeSelect,
        });
        if (input.branchId !== undefined && input.quantity !== undefined) {
          await writeStockQuantity(
            transaction,
            {
              branchId: input.branchId,
              typeId: type.id,
              quantity: input.quantity,
            },
            principal,
            now,
          );
        }
        return toTypeView(type);
      })
      .catch(translateEquipmentError);
  },

  renameType: async (
    input: { typeId: string; name: string },
    principal: AuthenticatedPrincipal,
  ): Promise<EquipmentTypeView> => {
    requireAdministrator(principal);
    const name = cleanName(input.name);
    return prisma
      .$transaction(async (transaction) => {
        await lockActiveType(transaction, input.typeId, 'update');
        return transaction.equipmentType.update({
          where: { id: input.typeId },
          data: { name, updatedAt: dependencies.now() },
          select: equipmentTypeSelect,
        });
      })
      .then(toTypeView, translateEquipmentError);
  },

  // «Quitar tipo»: final, and only once no Branch has a unit in service or a
  // count above zero.
  archiveType: async (
    input: { typeId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<EquipmentTypeView> => {
    requireAdministrator(principal);
    return prisma
      .$transaction(async (transaction) => {
        await lockActiveType(transaction, input.typeId, 'update');
        const [units, counted] = await Promise.all([
          transaction.equipment.count({
            where: { typeId: input.typeId, archivedAt: null },
          }),
          transaction.equipmentStock.count({
            where: { typeId: input.typeId, quantity: { gt: 0 } },
          }),
        ]);
        if (units > 0 || counted > 0) {
          throw new BackOfficeError('equipment_type_in_use');
        }
        const now = dependencies.now();
        return transaction.equipmentType.update({
          where: { id: input.typeId },
          data: { archivedAt: now, updatedAt: now },
          select: equipmentTypeSelect,
        });
      })
      .then(toTypeView, translateEquipmentError);
  },
});

export type EquipmentTypeOperations = ReturnType<
  typeof createPrismaEquipmentTypes
>;
