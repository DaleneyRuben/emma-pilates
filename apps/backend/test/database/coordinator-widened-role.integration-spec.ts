import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaSupplies } from '../../src/back-office/supplies/prisma-supplies';
import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { createPrismaStudioSettings } from '../../src/booking/studio-settings/prisma-studio-settings';
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
    return error instanceof BackOfficeError ||
      error instanceof AdministrationError
      ? error.code
      : String(error);
  }
};

// BKO-010 / ADR-0108: the Coordinator runs Insumos without its catalog and
// reads the studio rules without their amounts.
describe('the widened Coordinator on PostgreSQL', () => {
  let world: EvaluationTestWorld;
  const supplies = () =>
    createPrismaSupplies(world.prisma, { now: () => fixtureNow });
  const settings = () =>
    createPrismaStudioSettings(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const coordinator = () => world.principalOf('carolina.rivas@example.com');
  const urubo = branchIdOf('urubo');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lists Supplies and records Withdrawals and Restocks, but never changes the catalog', async () => {
    const towels = await supplies().createSupply(
      {
        branchId: urubo,
        name: 'Toallas',
        initialQuantity: 5,
        lowStockThreshold: 2,
      },
      await administrator(),
    );

    await expect(
      supplies().recordWithdrawal(
        { supplyId: towels.id, quantity: 4 },
        await coordinator(),
        randomUUID(),
      ),
    ).resolves.toMatchObject({ quantityOnHand: 1 });
    await expect(
      supplies().recordRestock(
        { supplyId: towels.id, quantity: 2 },
        await coordinator(),
        randomUUID(),
      ),
    ).resolves.toMatchObject({ quantityOnHand: 3 });
    await expect(
      supplies().listSupplies(
        { branchId: urubo, status: 'active', page: 1, pageSize: 20 },
        await coordinator(),
      ),
    ).resolves.toMatchObject({ totalItems: 1, lowStockCount: 0 });
    await expect(
      supplies().listWithdrawals(
        { branchId: urubo, month: '2026-09', page: 1, pageSize: 20 },
        await coordinator(),
      ),
    ).resolves.toMatchObject({ month: '2026-09' });

    const denied = [
      await codeOf(
        supplies().createSupply(
          {
            branchId: urubo,
            name: 'Jabón',
            initialQuantity: 1,
            lowStockThreshold: 1,
          },
          await coordinator(),
        ),
      ),
      await codeOf(
        supplies().updateSupply(
          {
            supplyId: towels.id,
            name: 'Toallas de mano',
            lowStockThreshold: 1,
          },
          await coordinator(),
        ),
      ),
      await codeOf(
        supplies().archiveSupply({ supplyId: towels.id }, await coordinator()),
      ),
    ];
    expect(denied).toEqual([
      'back_office_access_denied',
      'back_office_access_denied',
      'back_office_access_denied',
    ]);
  });

  it('reads the studio rules without the Evaluation price or the fee, and cannot save them', async () => {
    const forAdministrator = await settings().read(await administrator());
    const forCoordinator = await settings().read(await coordinator());

    expect(forAdministrator.evaluationPriceCentavos).toEqual(
      expect.any(Number),
    );
    expect(forAdministrator.nutritionistFeeCentavos).toEqual(
      expect.any(Number),
    );
    expect(forCoordinator).toEqual({
      ...forAdministrator,
      evaluationPriceCentavos: null,
      nutritionistFeeCentavos: null,
    });
    await expect(
      codeOf(
        settings().update(
          {
            expectedVersion: forCoordinator.version,
            values: {
              minimumBookings: 3,
              taxRatePercent: forCoordinator.taxRatePercent,
              renewalTargetMonths1To6Percent:
                forCoordinator.renewalTargetMonths1To6Percent,
              renewalTargetMonths7To12Percent:
                forCoordinator.renewalTargetMonths7To12Percent,
              renewalTargetFromMonth13Percent:
                forCoordinator.renewalTargetFromMonth13Percent,
              openingDate: forCoordinator.openingDate,
            },
          },
          await coordinator(),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
  });
});
