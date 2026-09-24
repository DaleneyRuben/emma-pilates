import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

// WEB-008 (AW26, AW27): the counts and the last Credit movement the two
// read-only lists show. The fixtures give Sofía an awarded and a pending
// Referral and the Bs 60 of Credit the awarded one earned.
describe('Prisma administration Referral and Credit lists for AW26 and AW27', () => {
  let world: EvaluationTestWorld;
  const oversight = () =>
    createPrismaOversight(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it("counts the studio's awarded and pending Referrals and each referrer's total", async () => {
    const all = await oversight().listReferrals(
      { page: 1, pageSize: 20 },
      await administrator(),
    );

    expect(all).toMatchObject({
      totalItems: 2,
      awardedCount: 1,
      pendingCount: 1,
    });
    expect(all.items.map((item) => item.referrerReferralCount)).toEqual([2, 2]);
  });

  it('keeps the studio counts and the referrer total while a search narrows the rows', async () => {
    const [first] = (
      await oversight().listReferrals(
        { page: 1, pageSize: 20 },
        await administrator(),
      )
    ).items;
    const narrowed = await oversight().listReferrals(
      { query: first.referredName, page: 1, pageSize: 20 },
      await administrator(),
    );

    expect(narrowed).toMatchObject({
      totalItems: 1,
      awardedCount: 1,
      pendingCount: 1,
      items: [
        expect.objectContaining({
          referredName: first.referredName,
          referrerReferralCount: 2,
        }),
      ],
    });
  });

  it('says whether the last Credit movement earned, reserved, spent, or returned it', async () => {
    const credits = await oversight().listCredits(
      { page: 1, pageSize: 20 },
      await administrator(),
    );

    expect(credits.items).toEqual([
      expect.objectContaining({
        clientName: 'Sofía Guzmán',
        lastMovementKind: 'earned',
      }),
    ]);
  });
});
