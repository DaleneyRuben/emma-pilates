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

// FIX-067: studio-defined Equipment Types and their numbered units.
describe('Prisma Back Office equipment types', () => {
  let world: EvaluationTestWorld;
  const now = () => fixtureNow;
  const types = () => createPrismaEquipmentTypes(world.prisma, { now });
  const equipment = () => createPrismaEquipment(world.prisma, { now });
  const stocks = () => createPrismaEquipmentStocks(world.prisma, { now });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const coordinator = () => world.principalOf('carolina.rivas@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');
  const centro = branchIdOf('centro');
  const urubo = branchIdOf('urubo');

  const create = async (
    name: string,
    tracking: 'unit' | 'quantity',
    extra: { branchId?: string; quantity?: number } = {},
  ) => types().createType({ name, tracking, ...extra }, await administrator());

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lists the seeded types first, then the studio’s types by name', async () => {
    const balones = await create(' Balones ', 'quantity', {
      branchId: centro,
      quantity: 12,
    });
    expect(balones).toEqual({
      id: expect.any(String) as string,
      name: 'Balones',
      tracking: 'quantity',
      legacyKind: null,
    });
    await create('aros', 'quantity');
    await create('Silla Wunda', 'unit');

    const listed = await types().listTypes(await coordinator());
    expect(
      listed.items.map((item) => [item.name, item.tracking, item.legacyKind]),
    ).toEqual([
      ['Reformer', 'unit', 'reformer'],
      ['Cadillac', 'unit', 'cadillac'],
      ['Mat', 'unit', 'mat'],
      ['aros', 'quantity', null],
      ['Balones', 'quantity', null],
      ['Silla Wunda', 'unit', null],
    ]);
    const centroStocks = await stocks().listStocks(
      { branchId: centro },
      await administrator(),
    );
    expect(centroStocks.items).toEqual([
      {
        typeId: expect.any(String) as string,
        typeName: 'aros',
        branchId: centro,
        quantity: 0,
        damaged: 0,
        usable: 0,
      },
      {
        typeId: balones.id,
        typeName: 'Balones',
        branchId: centro,
        quantity: 12,
        damaged: 0,
        usable: 12,
      },
    ]);
  });

  it('refuses a repeated or invalid name, and creating or renaming for anyone but the Administrator', async () => {
    await create('Barril', 'unit');
    await expect(codeOf(create('BARRIL', 'quantity'))).resolves.toBe(
      'equipment_type_name_taken',
    );
    await expect(codeOf(create('   ', 'unit'))).resolves.toBe(
      'invalid_back_office_value',
    );
    await expect(codeOf(create('x'.repeat(41), 'unit'))).resolves.toBe(
      'invalid_back_office_value',
    );
    await expect(
      codeOf(create('Pelotas', 'unit', { branchId: centro, quantity: 3 })),
    ).resolves.toBe('invalid_back_office_value');
    for (const principal of [await coordinator(), await assistant()]) {
      await expect(
        codeOf(
          types().createType({ name: 'Bosu', tracking: 'unit' }, principal),
        ),
      ).resolves.toBe('back_office_access_denied');
    }
    await expect(codeOf(types().listTypes(await assistant()))).resolves.toBe(
      'back_office_access_denied',
    );
  });

  it('renames a type, seeded ones included, under the same name rule', async () => {
    const torre = await create('Torre', 'unit');
    await expect(
      types().renameType(
        { typeId: torre.id, name: ' Torre de pared ' },
        await administrator(),
      ),
    ).resolves.toMatchObject({ id: torre.id, name: 'Torre de pared' });
    await expect(
      codeOf(
        types().renameType(
          { typeId: torre.id, name: 'mat' },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_type_name_taken');
    await expect(
      codeOf(
        types().renameType(
          { typeId: randomUUID(), name: 'Nada' },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_type_not_found');
    await expect(
      codeOf(
        types().renameType(
          { typeId: torre.id, name: 'Torre' },
          await coordinator(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');
  });

  it('registers numbered units of a studio type by its id, and the old kind still works', async () => {
    const wunda = await create('Wunda', 'unit');
    const aros = await create('Aros grandes', 'quantity');
    const unit = await equipment().createEquipment(
      { branchId: centro, typeId: wunda.id, number: 2 },
      await coordinator(),
    );
    expect(unit).toMatchObject({
      typeId: wunda.id,
      typeName: 'Wunda',
      kind: null,
      number: 2,
      status: 'working',
    });
    await equipment().createEquipment(
      { branchId: centro, typeId: wunda.id, number: 1 },
      await administrator(),
    );
    const reformer = await equipment().createEquipment(
      { branchId: centro, kind: 'reformer', number: 1 },
      await administrator(),
    );
    expect(reformer).toMatchObject({ typeName: 'Reformer', kind: 'reformer' });
    const mat = (await types().listTypes(await administrator())).items.find(
      (item) => item.legacyKind === 'mat',
    )!;
    await expect(
      equipment().createEquipment(
        { branchId: centro, typeId: mat.id, number: 1 },
        await administrator(),
      ),
    ).resolves.toMatchObject({ kind: 'mat', typeId: mat.id });

    await expect(
      codeOf(
        equipment().createEquipment(
          { branchId: centro, typeId: wunda.id, number: 2 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_number_taken');
    await expect(
      codeOf(
        equipment().createEquipment(
          { branchId: centro, typeId: aros.id, number: 1 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_type_not_unit');
    await expect(
      codeOf(
        equipment().createEquipment(
          { branchId: centro, typeId: randomUUID(), number: 1 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_type_not_found');

    const listed = await equipment().listEquipment(
      { branchId: centro },
      await administrator(),
    );
    expect(listed.items.map((item) => [item.typeName, item.number])).toEqual([
      ['Reformer', 1],
      ['Mat', 1],
      ['Wunda', 1],
      ['Wunda', 2],
    ]);
  });

  it('archives a type only while no Branch uses it, and frees its name', async () => {
    const bosu = await create('Bosu', 'unit');
    const discos = await create('Discos', 'quantity', {
      branchId: urubo,
      quantity: 4,
    });
    const unit = await equipment().createEquipment(
      { branchId: urubo, typeId: bosu.id, number: 1 },
      await administrator(),
    );
    const archive = async (typeId: string) =>
      types().archiveType({ typeId }, await administrator());

    await expect(codeOf(archive(bosu.id))).resolves.toBe(
      'equipment_type_in_use',
    );
    await expect(codeOf(archive(discos.id))).resolves.toBe(
      'equipment_type_in_use',
    );
    await equipment().archiveEquipment(
      { equipmentId: unit.id },
      await administrator(),
    );
    await stocks().setStockQuantity(
      { branchId: urubo, typeId: discos.id, quantity: 0 },
      await administrator(),
    );
    await expect(archive(bosu.id)).resolves.toMatchObject({ id: bosu.id });
    await expect(archive(discos.id)).resolves.toMatchObject({
      id: discos.id,
    });
    await expect(
      codeOf(types().archiveType({ typeId: bosu.id }, await coordinator())),
    ).resolves.toBe('back_office_access_denied');

    const listed = await types().listTypes(await administrator());
    expect(listed.items.map((item) => item.id)).not.toContain(bosu.id);
    await expect(
      codeOf(
        equipment().createEquipment(
          { branchId: urubo, typeId: bosu.id, number: 2 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_type_not_found');
    await expect(
      codeOf(
        types().renameType(
          { typeId: bosu.id, name: 'Bosu viejo' },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_type_not_found');
    await expect(create('bosu', 'unit')).resolves.toMatchObject({
      name: 'bosu',
    });
  });
});
