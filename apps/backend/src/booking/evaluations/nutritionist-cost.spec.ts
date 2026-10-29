import { nutritionistCostOfMonth } from './nutritionist-cost';

const month = new Date('2026-09-01T00:00:00.000Z');

// Decisions §6: the studio pays Bs 50 per Evaluation held. A cancelled
// one was not held, so it must not add to the month even when its cost
// was already written (the column is immutable once set).
describe('nutritionistCostOfMonth', () => {
  it('sums held Evaluations and skips cancelled ones', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { nutritionistCostCentavos: 5_000 },
        { nutritionistCostCentavos: 5_000 },
      ]);

    await expect(
      nutritionistCostOfMonth(
        { evaluation: { findMany } } as unknown as Parameters<
          typeof nutritionistCostOfMonth
        >[0],
        month,
      ),
    ).resolves.toBe(10_000);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        nutritionistCostCentavos: { not: null },
        state: { not: 'CANCELLED' },
        slot: { localMonth: month },
      },
      select: { nutritionistCostCentavos: true },
    });
  });
});
