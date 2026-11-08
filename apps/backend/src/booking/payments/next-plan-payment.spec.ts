import { isNextPlanPayment } from './next-plan-payment';

const now = new Date('2026-11-08T15:00:00.000Z');
const payment = {
  clientId: 'client-id',
  startsOn: new Date('2027-01-02T00:00:00.000Z'),
  subscriptionId: null,
  state: 'pending' as const,
  kind: 'plan' as const,
};

// FIX-052: only a Plan sale that can still start is a next Plan.
describe('isNextPlanPayment', () => {
  const findFirst = jest.fn();
  const prisma = { subscription: { findFirst } } as never;

  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue({ id: 'current' });
  });

  it('is a next Plan while another Subscription ends before it starts', async () => {
    await expect(isNextPlanPayment(prisma, payment, now)).resolves.toBe(true);
  });

  it.each([
    { state: 'rejected' as const },
    { state: 'voided' as const },
    { kind: 'evaluation' as const },
  ])('is never a next Plan for %o', async (change) => {
    await expect(
      isNextPlanPayment(prisma, { ...payment, ...change }, now),
    ).resolves.toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
