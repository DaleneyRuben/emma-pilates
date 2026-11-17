import { randomUUID } from 'node:crypto';
import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';
import { insertSoldSubscription } from './studio-facts-test-support';

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

  // FIX-060 (walkthrough finding 86): whether the friend bought, and whether
  // her host got the extra class, read from the Payments and the guest pass.
  it('says when the friend first bought and where the extra class stands', async () => {
    const clientOf = (email: string) =>
      world.prisma.client.findFirstOrThrow({
        where: { account: { email } },
        select: { id: true },
      });
    const sofia = await clientOf('sofia@example.com');
    const mariana = await clientOf('mariana@example.com');
    const valeria = await clientOf('valeria@example.com');
    const [firstPurchase] = await world.prisma.payment.findMany({
      where: {
        clientId: valeria.id,
        state: 'CONFIRMED',
        kind: 'PLAN',
        method: { not: 'COURTESY' },
      },
      orderBy: { decidedAt: 'asc' },
      select: { decidedAt: true },
    });
    const plan = await world.prisma.plan.findFirstOrThrow({
      select: { id: true },
    });
    const branch = await world.prisma.branch.findFirstOrThrow({
      select: { id: true },
    });
    const account = await world.prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com' },
      select: { id: true },
    });
    // Mariana's guest pass: a courtesy Subscription is no purchase.
    const courtesy = await insertSoldSubscription(
      world.context,
      {
        branchId: branch.id,
        classTypeId: randomUUID(),
        trainerId: randomUUID(),
        accountId: account.id,
        planId: plan.id,
      },
      {
        clientId: mariana.id,
        startsOn: '2026-09-15',
        endsOn: '2026-10-14',
        method: 'courtesy',
        paymentState: 'confirmed',
      },
    );
    const passId = randomUUID();
    await world.context.pool.query(
      `INSERT INTO booking.guest_passes
         (id, host_client_id, friend_client_id, courtesy_subscription_id,
          reward_owed)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [passId, sofia.id, mariana.id, courtesy],
    );
    const rowsByName = async () =>
      Object.fromEntries(
        (
          await oversight().listReferrals(
            { page: 1, pageSize: 20 },
            await administrator(),
          )
        ).items.map((item) => [item.referredName, item]),
      );

    const owed = await rowsByName();
    expect(owed['Valeria Quiroga']).toMatchObject({
      firstPurchaseAt: firstPurchase?.decidedAt,
      inviteReward: 'none',
      inviteRewardGrantedAt: null,
    });
    expect(firstPurchase?.decidedAt).toBeInstanceOf(Date);
    expect(owed['Mariana Peña']).toMatchObject({
      firstPurchaseAt: null,
      inviteReward: 'owed',
      inviteRewardGrantedAt: null,
    });

    const grantedAt = new Date('2026-09-20T14:00:00.000Z');
    await world.prisma.guestPass.update({
      where: { id: passId },
      data: { rewardedAt: grantedAt, rewardOwed: false },
    });
    expect((await rowsByName())['Mariana Peña']).toMatchObject({
      inviteReward: 'granted',
      inviteRewardGrantedAt: grantedAt,
    });
  });
});
