import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  EquipmentTracking,
} from '../../generated/prisma/enums';
import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError, type BackOfficeActor } from '../back-office-errors';
import {
  cleanDescription,
  issueSelect,
  toIssueView,
  type EquipmentIssueView,
} from './equipment-records';

type Transaction = Prisma.TransactionClient;

export type EquipmentStockView = {
  typeId: string;
  typeName: string;
  branchId: string;
  quantity: number;
  damaged: number;
  usable: number;
};

const maximumQuantity = 9_999;

export const isStockQuantity = (value: number, minimum: number) =>
  Number.isInteger(value) && value >= minimum && value <= maximumQuantity;

export const toStockView = (
  type: { id: string; name: string },
  branchId: string,
  quantity: number,
  damaged: number,
): EquipmentStockView => ({
  typeId: type.id,
  typeName: type.name,
  branchId,
  quantity,
  damaged,
  usable: quantity - damaged,
});

// Reads a type for a change that depends on it, holding it against a
// concurrent archive. An unknown or archived type is not found.
export const lockActiveType = async (
  transaction: Transaction,
  typeId: string,
  mode: 'share' | 'update' = 'share',
) => {
  const locked =
    mode === 'share'
      ? await transaction.$queryRaw<{ id: string }[]>`
          SELECT id FROM back_office.equipment_types
          WHERE id = ${typeId}::uuid AND archived_at IS NULL FOR SHARE`
      : await transaction.$queryRaw<{ id: string }[]>`
          SELECT id FROM back_office.equipment_types
          WHERE id = ${typeId}::uuid AND archived_at IS NULL FOR UPDATE`;
  if (locked.length === 0) {
    throw new BackOfficeError('equipment_type_not_found');
  }
  return transaction.equipmentType.findUniqueOrThrow({
    where: { id: typeId },
    select: { id: true, name: true, tracking: true, legacyKind: true },
  });
};

export const lockQuantityType = async (
  transaction: Transaction,
  typeId: string,
) => {
  const type = await lockActiveType(transaction, typeId);
  if (type.tracking !== EquipmentTracking.QUANTITY) {
    throw new BackOfficeError('equipment_type_not_quantity');
  }
  return type;
};

// The Branch's stock row of a type, created at zero when missing, locked so
// that damage and the quantity are checked against one another in order.
export const lockStock = async (
  transaction: Transaction,
  branchId: string,
  typeId: string,
  now: Date,
) => {
  await transaction.equipmentStock.createMany({
    data: [{ branchId, typeId, quantity: 0, createdAt: now, updatedAt: now }],
    skipDuplicates: true,
  });
  const [stock] = await transaction.$queryRaw<
    { id: string; quantity: number }[]
  >`
    SELECT id, quantity FROM back_office.equipment_stocks
    WHERE branch_id = ${branchId}::uuid AND type_id = ${typeId}::uuid
    FOR UPDATE`;
  return stock;
};

export const openDamage = async (transaction: Transaction, stockId: string) =>
  (
    await transaction.equipmentIssue.aggregate({
      where: { stockId, resolvedAt: null },
      _sum: { quantity: true },
    })
  )._sum.quantity ?? 0;

// Every change of a stock's quantity is audited in its transaction (FIX-067).
export const auditQuantityChange = async (
  transaction: Transaction,
  principal: AuthenticatedPrincipal,
  change: {
    stockId: string;
    branchId: string;
    typeId: string;
    previousQuantity: number;
    quantity: number;
    occurredAt: Date;
  } & ({ cause: 'set' } | { cause: 'write_off'; issueId: string }),
) => {
  const actor = auditActorOf(principal);
  const { stockId, branchId, occurredAt, ...metadata } = change;
  await transaction.auditRecord.create({
    data: {
      actionCode: 'equipment.quantity_changed',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.accountId,
      actorRole: actor.role,
      impersonationId: actor.impersonationId,
      targetType: 'equipment_stock',
      targetId: stockId,
      branchId,
      correlationId: randomUUID(),
      metadata,
      occurredAt,
    },
  });
};

// Sets a Branch's count of a quantity type; never below its open damage.
export const writeStockQuantity = async (
  transaction: Transaction,
  input: { branchId: string; typeId: string; quantity: number },
  principal: AuthenticatedPrincipal,
  now: Date,
): Promise<EquipmentStockView> => {
  if (!isStockQuantity(input.quantity, 0)) {
    throw new BackOfficeError('invalid_back_office_value');
  }
  const type = await lockQuantityType(transaction, input.typeId);
  const stock = await lockStock(transaction, input.branchId, type.id, now);
  const damaged = await openDamage(transaction, stock.id);
  if (input.quantity < damaged) {
    throw new BackOfficeError('equipment_quantity_below_damaged');
  }
  if (input.quantity !== stock.quantity) {
    await transaction.equipmentStock.update({
      where: { id: stock.id },
      data: { quantity: input.quantity, updatedAt: now },
    });
    await auditQuantityChange(transaction, principal, {
      stockId: stock.id,
      branchId: input.branchId,
      typeId: type.id,
      previousQuantity: stock.quantity,
      quantity: input.quantity,
      cause: 'set',
      occurredAt: now,
    });
  }
  return toStockView(type, input.branchId, input.quantity, damaged);
};

// Damage to some of a Branch's stock; never more than what is usable.
export const recordStockDamage = async (
  transaction: Transaction,
  input: {
    branchId: string;
    typeId: string;
    quantity: number;
    description: string;
  },
  actor: BackOfficeActor,
  now: Date,
): Promise<EquipmentIssueView> => {
  if (!isStockQuantity(input.quantity, 1)) {
    throw new BackOfficeError('invalid_back_office_value');
  }
  const description = cleanDescription(input.description);
  const type = await lockQuantityType(transaction, input.typeId);
  const stock = await lockStock(transaction, input.branchId, type.id, now);
  const usable = stock.quantity - (await openDamage(transaction, stock.id));
  if (input.quantity > usable) {
    throw new BackOfficeError('equipment_damage_exceeds_usable');
  }
  const issue = await transaction.equipmentIssue.create({
    data: {
      stockId: stock.id,
      quantity: input.quantity,
      description,
      outOfService: false,
      reportedByAccountId: actor.accountId,
      reportedAt: now,
    },
    select: issueSelect,
  });
  return toIssueView(issue);
};
