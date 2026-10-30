import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import { createFixture } from './booking-command-test-support';
import {
  codeOf,
  now,
  PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const date = (civil: string) => new Date(`${civil}T00:00:00.000Z`);

// FIX-019 (4), owner 2026-10-30: Courtesy Access replaces a Guest Pass the
// friend has not used, instead of answering subscription_not_expired.
describe('courtesy access over a guest pass', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const administrator = () => world.staffPrincipal('paola.mendoza@example.com');
  const access = () => createPrismaCourtesyAccess(prisma, { now: () => now });

  const friendWithGuestPass = async (name: string) => {
    const fixture = await createFixture(prisma, { now });
    const host = await world.newClient(`Anfitriona de ${name}`);
    const friend = await world.newClient(name);
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.clientId,
        friendClientId: friend.clientId,
        authorAccountId: fixture.accountId,
        now,
      }),
    );
    const pass = await prisma.guestPass.findFirstOrThrow({
      where: { friendClientId: friend.clientId },
      select: { courtesySubscriptionId: true },
    });
    return { friend, fixture, passSubscriptionId: pass.courtesySubscriptionId };
  };

  it('replaces an unused Guest Pass with the Courtesy Access', async () => {
    const { friend, passSubscriptionId } =
      await friendWithGuestPass('Invitada sin usar');

    const granted = await access().grant(
      { clientId: friend.clientId, endsOn: date('2026-10-20') },
      await administrator(),
      randomUUID(),
    );

    expect(granted.startsOn).toBe('2026-09-21');
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: passSubscriptionId },
        select: { state: true },
      }),
    ).resolves.toMatchObject({ state: 'EXPIRED' });
    await expect(
      prisma.auditRecord.count({
        where: {
          actionCode: 'subscription.ended_early',
          targetId: passSubscriptionId,
        },
      }),
    ).resolves.toBe(1);
  });

  it('still refuses Courtesy Access over a Guest Pass with its class booked', async () => {
    const { friend, fixture } = await friendWithGuestPass('Invitada reservada');
    await new PrismaBookingCommands(prisma, () => now).create(
      { sessionId: fixture.sessionId },
      friend,
    );

    await expect(
      codeOf(
        access().grant(
          { clientId: friend.clientId, endsOn: date('2026-10-20') },
          await administrator(),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('subscription_not_expired');
  });
});
