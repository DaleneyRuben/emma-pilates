import { createPrismaCatalogAdministration } from '../../src/booking/administration/prisma-catalog-administration';
import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof AdministrationError) return error.code;
    return String(error);
  }
};

describe('Prisma catalog administration', () => {
  let world: EvaluationTestWorld;
  const catalog = () =>
    createPrismaCatalogAdministration(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lets only an Administrator create, rename, and list Branches', async () => {
    const created = await catalog().createBranch(
      { name: ' Sucursal Norte ', address: 'Av. Banzer 3er anillo' },
      await administrator(),
    );
    expect(created).toMatchObject({ name: 'Sucursal Norte', archivedAt: null });

    await expect(
      catalog().updateBranch(
        {
          branchId: created.id,
          name: 'Norte',
          address: 'Av. Banzer 4to anillo',
        },
        await administrator(),
      ),
    ).resolves.toMatchObject({
      name: 'Norte',
      address: 'Av. Banzer 4to anillo',
    });
    const branches = await catalog().listBranches(await administrator());
    expect(branches.map((branch) => branch.name)).toContain('Norte');

    await expect(
      codeOf(
        catalog().createBranch({ name: 'X', address: 'Y' }, await assistant()),
      ),
    ).resolves.toBe('administration_access_denied');
    await expect(
      codeOf(
        catalog().updateBranch(
          { branchId: deterministicId('missing'), name: 'X', address: 'Y' },
          await administrator(),
        ),
      ),
    ).resolves.toBe('branch_not_found');
  });

  it('refuses to archive a Branch with upcoming Sessions and ends Nutritionist blocks when archiving an idle one', async () => {
    await expect(
      codeOf(
        catalog().archiveBranch(
          { branchId: deterministicId('branch:centro') },
          await administrator(),
        ),
      ),
    ).resolves.toBe('branch_in_use');

    const idle = await catalog().createBranch(
      { name: 'Sucursal Temporal', address: 'Calle 1' },
      await administrator(),
    );
    const carla = deterministicId('test-nutritionist:carla');
    await world.prisma.staffBranchAssignment.create({
      data: { staffMemberId: carla, branchId: idle.id },
    });
    await world.prisma.availabilityBlock.create({
      data: {
        nutritionistStaffMemberId: carla,
        branchId: idle.id,
        weekday: 3,
        startsAtLocal: new Date('1970-01-01T09:00:00.000Z'),
        endsAtLocal: new Date('1970-01-01T10:30:00.000Z'),
        effectiveFrom: new Date('2026-09-21T00:00:00.000Z'),
        createdByAccountId: (await administrator()).accountId,
        createdAt: new Date('2026-09-20T12:00:00.000Z'),
      },
    });

    const archived = await catalog().archiveBranch(
      { branchId: idle.id },
      await administrator(),
    );

    expect(archived.archivedAt).not.toBeNull();
    await expect(
      world.prisma.availabilityBlock.count({
        where: { branchId: idle.id, effectiveUntil: null },
      }),
    ).resolves.toBe(0);
  });

  it('manages Class Types, rejecting duplicate names and archiving only unused ones', async () => {
    const barre = await catalog().createClassType(
      {
        name: 'Barre',
        description: 'Tonificación con barra.',
        durationMinutes: 45,
        defaultCapacity: 10,
        equipmentNeeds: null,
      },
      await administrator(),
    );
    await expect(
      codeOf(
        catalog().createClassType(
          {
            name: ' barre ',
            description: 'Otra',
            durationMinutes: 45,
            defaultCapacity: 10,
            equipmentNeeds: null,
          },
          await administrator(),
        ),
      ),
    ).resolves.toBe('class_type_name_taken');
    await expect(
      catalog().updateClassType(
        { ...barre, classTypeId: barre.id, durationMinutes: 50 },
        await administrator(),
      ),
    ).resolves.toMatchObject({ durationMinutes: 50 });
    await expect(
      codeOf(
        catalog().archiveClassType(
          { classTypeId: deterministicId('class-type:reformer') },
          await administrator(),
        ),
      ),
    ).resolves.toBe('class_type_in_use');
    await expect(
      catalog().archiveClassType(
        { classTypeId: barre.id },
        await administrator(),
      ),
    ).resolves.toMatchObject({ archivedAt: expect.any(Date) });
  });

  it('creates, reprices, and hides Plans with audits, and rejects invalid durations', async () => {
    const admin = await administrator();
    const plan = await catalog().createPlan(
      {
        name: 'Paquete de 4 clases',
        durationMonths: 1,
        classAllowance: 4,
        priceCentavos: 32_000,
        displayOrder: 9,
      },
      admin,
    );
    await expect(
      catalog().updatePlan(
        { ...plan, planId: plan.id, priceCentavos: 30_000 },
        admin,
      ),
    ).resolves.toMatchObject({ priceCentavos: 30_000 });
    await expect(
      catalog().setPlanVisibility({ planId: plan.id, visible: false }, admin),
    ).resolves.toMatchObject({ hiddenAt: expect.any(Date) });
    await expect(
      codeOf(
        catalog().createPlan(
          {
            name: 'Raro',
            durationMonths: 2,
            classAllowance: 4,
            priceCentavos: 1,
            displayOrder: 1,
          },
          admin,
        ),
      ),
    ).resolves.toBe('invalid_catalog_value');

    const audits = await world.prisma.auditRecord.findMany({
      where: { targetId: plan.id },
      orderBy: { actionCode: 'asc' },
      select: { actionCode: true, actorRole: true, targetType: true },
    });
    expect(audits).toEqual([
      {
        actionCode: 'plan.created',
        actorRole: 'ADMINISTRATOR',
        targetType: 'plan',
      },
      {
        actionCode: 'plan.updated',
        actorRole: 'ADMINISTRATOR',
        targetType: 'plan',
      },
      {
        actionCode: 'plan.visibility_changed',
        actorRole: 'ADMINISTRATOR',
        targetType: 'plan',
      },
    ]);
  });
});
