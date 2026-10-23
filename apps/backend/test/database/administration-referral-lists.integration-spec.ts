import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

// WEB-008 (AW26): the counts the read-only Referral list shows. AW27's
// Credit list went with Credit (PAY-005).
describe('Prisma administration Referral list for AW26', () => {
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

  it("counts the studio's Referrals, none awarded since PAY-005, and each referrer's total", async () => {
    const all = await oversight().listReferrals(
      { page: 1, pageSize: 20 },
      await administrator(),
    );

    expect(all).toMatchObject({
      totalItems: 2,
      awardedCount: 0,
      pendingCount: 2,
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
      awardedCount: 0,
      pendingCount: 2,
      items: [
        expect.objectContaining({
          referredName: first.referredName,
          referrerReferralCount: 2,
        }),
      ],
    });
  });
});
