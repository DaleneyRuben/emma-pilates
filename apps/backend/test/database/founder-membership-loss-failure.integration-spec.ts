import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createFounderMembershipJob } from '../../src/booking/payments/founder-membership-job';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

// The loss, its audit record and the notice are one transaction: a notice
// that cannot be written keeps the place, and the sweep reports it.
describe('founder membership loss that fails', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const cash = async (clientId: string, planId: string) => {
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    return world
      .commands()
      .recordCashPayment(
        { clientId, planId, branchId: centro.id },
        assistant,
        randomUUID(),
      );
  };

  it('keeps the place, writes no notice and reports it when the loss cannot be recorded', async () => {
    await prisma.founderMembership.updateMany({
      data: { deletedAt: now },
    });
    const lapsed = await world.newClient('Pérdida a medias');
    await cash(lapsed.clientId, plan.id);
    await prisma.subscription.updateMany({
      where: { clientId: lapsed.clientId },
      data: { endsOn: new Date('2026-10-14T00:00:00.000Z') },
    });
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION booking.fail_founder_notice()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.business_event_key LIKE 'founder-membership-lost:%' THEN
          RAISE EXCEPTION 'notice broke';
        END IF;
        RETURN NEW;
      END $$`);
    await prisma.$executeRaw`
      CREATE TRIGGER fail_founder_notice
      BEFORE INSERT ON system.notifications
      FOR EACH ROW EXECUTE FUNCTION booking.fail_founder_notice()`;

    try {
      await expect(
        createFounderMembershipJob(
          prisma,
          () => new Date('2026-10-23T15:00:00.000Z'),
        ).execute(),
      ).rejects.toThrow('founder_memberships failed for 1 item');
      await expect(
        prisma.founderMembership.findFirstOrThrow({
          where: { clientId: lapsed.clientId },
        }),
      ).resolves.toMatchObject({ status: 'ACTIVE' });
    } finally {
      await prisma.$executeRaw`
        DROP TRIGGER IF EXISTS fail_founder_notice ON system.notifications`;
      await prisma.$executeRaw`
        DROP FUNCTION IF EXISTS booking.fail_founder_notice()`;
    }
  });
});
