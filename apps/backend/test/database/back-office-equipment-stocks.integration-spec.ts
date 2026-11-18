import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaEquipment } from '../../src/back-office/equipment/prisma-equipment';
import { createPrismaEquipmentStocks } from '../../src/back-office/equipment/prisma-equipment-stocks';
import { createPrismaEquipmentTypes } from '../../src/back-office/equipment/prisma-equipment-types';
import {
  branchIdOf,
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof BackOfficeError) return error.code;
    return String(error);
  }
};

// FIX-067: counted equipment (Balones: 12, 1 dañado) and its damage.
describe('Prisma Back Office equipment stocks', () => {
  let world: EvaluationTestWorld;
  let clock = fixtureNow;
  const now = () => clock;
  const types = () => createPrismaEquipmentTypes(world.prisma, { now });
  const equipment = () => createPrismaEquipment(world.prisma, { now });
  const stocks = () => createPrismaEquipmentStocks(world.prisma, { now });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const coordinator = () => world.principalOf('carolina.rivas@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');
  const centro = branchIdOf('centro');
  const urubo = branchIdOf('urubo');
  let balones: string;
  let wunda: string;

  const stockOf = async (typeId: string, branchId = centro) =>
    (await stocks().listStocks({ branchId }, await administrator())).items.find(
      (item) => item.typeId === typeId,
    );

  const damage = async (quantity: number, typeId = balones) =>
    stocks().reportStockDamage(
      { branchId: centro, typeId, quantity, description: 'Pinchado' },
      await coordinator(),
    );

  const quantityAudits = () =>
    world.prisma.auditRecord.findMany({
      where: { actionCode: 'equipment.quantity_changed' },
      orderBy: { occurredAt: 'asc' },
      select: {
        actorRole: true,
        targetType: true,
        branchId: true,
        metadata: true,
      },
    });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    balones = (
      await types().createType(
        { name: 'Balones', tracking: 'quantity' },
        await administrator(),
      )
    ).id;
    wunda = (
      await types().createType(
        { name: 'Wunda', tracking: 'unit' },
        await administrator(),
      )
    ).id;
  });

  afterEach(() => {
    clock = fixtureNow;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('sets a Branch’s quantity, audits each change, and keeps Branches apart', async () => {
    await expect(stockOf(balones)).resolves.toMatchObject({
      quantity: 0,
      usable: 0,
    });
    await expect(
      stocks().setStockQuantity(
        { branchId: centro, typeId: balones, quantity: 12 },
        await coordinator(),
      ),
    ).resolves.toEqual({
      typeId: balones,
      typeName: 'Balones',
      branchId: centro,
      quantity: 12,
      damaged: 0,
      usable: 12,
    });
    await stocks().setStockQuantity(
      { branchId: centro, typeId: balones, quantity: 12 },
      await administrator(),
    );
    await expect(stockOf(balones, urubo)).resolves.toMatchObject({
      quantity: 0,
    });
    await expect(quantityAudits()).resolves.toEqual([
      {
        actorRole: 'COORDINATOR',
        targetType: 'equipment_stock',
        branchId: centro,
        metadata: {
          typeId: balones,
          previousQuantity: 0,
          quantity: 12,
          cause: 'set',
        },
      },
    ]);

    for (const [input, code] of [
      [{ typeId: wunda, quantity: 3 }, 'equipment_type_not_quantity'],
      [{ typeId: randomUUID(), quantity: 3 }, 'equipment_type_not_found'],
      [{ typeId: balones, quantity: 10_000 }, 'invalid_back_office_value'],
      [{ typeId: balones, quantity: -1 }, 'invalid_back_office_value'],
    ] as const) {
      await expect(
        codeOf(
          stocks().setStockQuantity(
            { branchId: centro, ...input },
            await administrator(),
          ),
        ),
      ).resolves.toBe(code);
    }
    await expect(
      codeOf(
        stocks().setStockQuantity(
          { branchId: randomUUID(), typeId: balones, quantity: 3 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('branch_not_found');
    await expect(
      codeOf(stocks().listStocks({ branchId: centro }, await assistant())),
    ).resolves.toBe('back_office_access_denied');
  });

  it('records damage within the usable count, lists it as an open fault, and resolves it back to usable', async () => {
    clock = new Date('2026-09-21T16:00:00.000Z');
    const pinchados = await damage(2);
    expect(pinchados).toMatchObject({
      equipmentId: null,
      equipmentKind: null,
      equipmentNumber: null,
      typeId: balones,
      typeName: 'Balones',
      quantity: 2,
      writtenOff: false,
      description: 'Pinchado',
      outOfService: false,
      reportedByName: 'Carolina Rivas',
      resolvedAt: null,
    });
    await expect(stockOf(balones)).resolves.toMatchObject({
      quantity: 12,
      damaged: 2,
      usable: 10,
    });
    await expect(codeOf(damage(11))).resolves.toBe(
      'equipment_damage_exceeds_usable',
    );
    await expect(codeOf(damage(0))).resolves.toBe('invalid_back_office_value');
    await expect(codeOf(damage(1, wunda))).resolves.toBe(
      'equipment_type_not_quantity',
    );
    await expect(
      codeOf(
        stocks().setStockQuantity(
          { branchId: centro, typeId: balones, quantity: 1 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_quantity_below_damaged');

    const open = await equipment().listIssues(
      { branchId: centro, status: 'open', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(open.items.map((issue) => issue.id)).toEqual([pinchados.id]);

    await expect(
      equipment().resolveIssue(
        { issueId: pinchados.id },
        await administrator(),
      ),
    ).resolves.toMatchObject({ writtenOff: false, quantity: 2 });
    await expect(stockOf(balones)).resolves.toMatchObject({
      quantity: 12,
      damaged: 0,
      usable: 12,
    });
  });

  it('writes damage off: resolves it and lowers the quantity in one step', async () => {
    const reventados = await damage(3);
    clock = new Date('2026-09-22T14:00:00.000Z');
    await expect(
      stocks().writeOffIssue({ issueId: reventados.id }, await assistant()),
    ).rejects.toThrow('back_office_access_denied');
    const writtenOff = await stocks().writeOffIssue(
      { issueId: reventados.id },
      await administrator(),
    );
    expect(writtenOff).toMatchObject({
      id: reventados.id,
      writtenOff: true,
      resolvedAt: clock,
      resolvedByName: 'Paola Mendoza',
    });
    await expect(stockOf(balones)).resolves.toMatchObject({
      quantity: 9,
      damaged: 0,
      usable: 9,
    });
    await expect(quantityAudits()).resolves.toContainEqual(
      expect.objectContaining({
        metadata: {
          typeId: balones,
          previousQuantity: 12,
          quantity: 9,
          cause: 'write_off',
          issueId: reventados.id,
        },
      }),
    );
    await expect(
      codeOf(
        stocks().writeOffIssue(
          { issueId: reventados.id },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_issue_resolved');
    await expect(
      codeOf(
        stocks().writeOffIssue(
          { issueId: randomUUID() },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_issue_not_found');

    const unit = await equipment().createEquipment(
      { branchId: centro, typeId: wunda, number: 1 },
      await administrator(),
    );
    const fault = await equipment().reportIssue(
      { equipmentId: unit.id, description: 'Pata floja', outOfService: false },
      await administrator(),
    );
    expect(fault).toMatchObject({
      typeId: wunda,
      typeName: 'Wunda',
      equipmentKind: null,
      equipmentNumber: 1,
      quantity: null,
      writtenOff: false,
    });
    await expect(
      codeOf(
        stocks().writeOffIssue({ issueId: fault.id }, await administrator()),
      ),
    ).resolves.toBe('equipment_issue_not_stock');
  });

  it('lets only one of two concurrent reports take the last usable units', async () => {
    await stocks().setStockQuantity(
      { branchId: centro, typeId: balones, quantity: 4 },
      await administrator(),
    );
    const results = await Promise.all([codeOf(damage(3)), codeOf(damage(3))]);
    expect(results.sort()).toEqual([
      'equipment_damage_exceeds_usable',
      'resolved',
    ]);
    await expect(stockOf(balones)).resolves.toMatchObject({
      quantity: 4,
      damaged: 3,
      usable: 1,
    });
  });
});
