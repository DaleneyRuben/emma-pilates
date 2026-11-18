import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaEquipment } from '../../src/back-office/equipment/prisma-equipment';
import { createPrismaEquipmentStocks } from '../../src/back-office/equipment/prisma-equipment-stocks';
import { createPrismaEquipmentTypes } from '../../src/back-office/equipment/prisma-equipment-types';
import { createPrismaSessionEquipment } from '../../src/back-office/equipment/prisma-session-equipment';
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

const hour = 60 * 60 * 1_000;

// FIX-067: S26 and the Horario flags with studio-defined types.
describe('Session equipment and flags with studio-defined types', () => {
  let world: EvaluationTestWorld;
  const now = () => fixtureNow;
  const types = () => createPrismaEquipmentTypes(world.prisma, { now });
  const equipment = () => createPrismaEquipment(world.prisma, { now });
  const stocks = () => createPrismaEquipmentStocks(world.prisma, { now });
  const sessionEquipment = () =>
    createPrismaSessionEquipment(world.prisma, { now });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const emma = () => world.principalOf('emma.vargas@example.com');
  const centro = branchIdOf('centro');
  const sessions: Record<string, string> = {};
  const typeIds: Record<string, string> = {};

  const createSession = async (
    key: string,
    classTypeName: string,
    startsAt: string,
    capacity: number,
  ) => {
    const [classType, trainer] = await Promise.all([
      world.prisma.classType.findFirst({ where: { name: classTypeName } }),
      world.prisma.account.findFirstOrThrow({
        where: { email: 'emma.vargas@example.com' },
      }),
    ]);
    const classTypeId =
      classType?.id ??
      (
        await world.prisma.classType.create({
          data: {
            name: classTypeName,
            description: 'Clase de prueba',
            defaultCapacity: capacity,
          },
        })
      ).id;
    const start = new Date(startsAt);
    sessions[key] = (
      await world.prisma.session.create({
        data: {
          branchId: centro,
          classTypeId,
          trainerStaffMemberId: trainer.staffMemberId!,
          startsAt: start,
          endsAt: new Date(start.getTime() + hour),
          capacity,
        },
      })
    ).id;
  };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    const principal = await administrator();
    for (const [key, name, tracking] of [
      ['wunda', 'Silla Wunda', 'unit'],
      ['balones', 'Balones', 'quantity'],
      ['aros', 'Aros', 'quantity'],
    ] as const) {
      typeIds[key] = (
        await types().createType({ name, tracking }, principal)
      ).id;
    }
    await stocks().setStockQuantity(
      { branchId: centro, typeId: typeIds.balones, quantity: 12 },
      principal,
    );
    for (const number of [1, 2]) {
      await equipment().createEquipment(
        { branchId: centro, typeId: typeIds.wunda, number },
        principal,
      );
    }
    await equipment().createEquipment(
      { branchId: centro, kind: 'reformer', number: 1 },
      principal,
    );
    await createSession(
      'wunda',
      'Silla Wunda intermedio',
      '2026-12-01T13:00:00.000Z',
      3,
    );
    await createSession(
      'reformer',
      'Reformer Pilates',
      '2026-12-02T13:00:00.000Z',
      1,
    );
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('flags a class of a studio unit type with more places than working units', async () => {
    const flags = await equipment().listFlaggedSessions(
      {
        branchId: centro,
        from: new Date('2026-11-01T00:00:00.000Z'),
        until: new Date('2027-01-01T00:00:00.000Z'),
      },
      await administrator(),
    );
    expect(flags).toEqual([
      {
        sessionId: sessions.wunda,
        typeId: typeIds.wunda,
        typeName: 'Silla Wunda',
        kind: null,
        capacity: 3,
        workingCount: 2,
      },
    ]);
  });

  it('keeps the old items and adds every type, the Session’s first', async () => {
    const listed = await sessionEquipment().listSessionEquipment(
      { sessionId: sessions.wunda },
      await emma(),
    );
    expect(listed.kind).toBeNull();
    expect(listed.typeId).toBe(typeIds.wunda);
    expect(listed.items.map((item) => [item.kind, item.number])).toEqual([
      ['reformer', 1],
    ]);
    expect(
      listed.types.map((type) => [
        type.name,
        type.tracking,
        type.units.map((unit) => unit.number),
        type.quantity,
        type.usable,
      ]),
    ).toEqual([
      ['Silla Wunda', 'unit', [1, 2], 0, 0],
      ['Reformer', 'unit', [1], 0, 0],
      ['Cadillac', 'unit', [], 0, 0],
      ['Mat', 'unit', [], 0, 0],
      ['Aros', 'quantity', [], 0, 0],
      ['Balones', 'quantity', [], 12, 12],
    ]);

    const reformer = await sessionEquipment().listSessionEquipment(
      { sessionId: sessions.reformer },
      await emma(),
    );
    expect(reformer).toMatchObject({ kind: 'reformer' });
    expect(reformer.types[0]).toMatchObject({ name: 'Reformer' });
    expect(reformer.typeId).toBe(reformer.types[0].id);
  });

  it('lets the leading Trainer report damage on a counted type', async () => {
    const report = async (quantity: number, typeId = typeIds.balones) =>
      sessionEquipment().reportSessionIssue(
        {
          sessionId: sessions.wunda,
          typeId,
          quantity,
          description: 'Se pincharon',
        },
        await emma(),
      );
    await expect(report(2)).resolves.toMatchObject({
      typeName: 'Balones',
      quantity: 2,
      equipmentId: null,
      reportedByName: 'Emma Vargas',
    });
    await expect(codeOf(report(11))).resolves.toBe(
      'equipment_damage_exceeds_usable',
    );
    await expect(codeOf(report(1, typeIds.aros))).resolves.toBe(
      'equipment_damage_exceeds_usable',
    );
    await expect(codeOf(report(1, typeIds.wunda))).resolves.toBe(
      'equipment_type_not_quantity',
    );
    const listed = await sessionEquipment().listSessionEquipment(
      { sessionId: sessions.wunda },
      await emma(),
    );
    expect(
      listed.types.find((type) => type.id === typeIds.balones),
    ).toMatchObject({ quantity: 12, usable: 10 });
    await expect(
      codeOf(
        sessionEquipment().reportSessionIssue(
          {
            sessionId: sessions.wunda,
            typeId: typeIds.balones,
            quantity: 1,
            description: 'x',
          },
          await administrator(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');
  });
});
