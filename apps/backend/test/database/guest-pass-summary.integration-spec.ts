import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createFixture } from './booking-command-test-support';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

// Walkthrough n.º 56 and 57: Mi plan tells a Guest Pass apart from a Plan
// with no classes left, and says when its class was used.
describe('guest pass in the Client subscription summary', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures: buildDevelopmentFixtures({ today }),
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('reads the pass unused, then the start of the class it was used for', async () => {
    const bookedAt = new Date('2026-09-23T15:00:00.000Z');
    const classStartsAt = new Date('2026-09-23T20:00:00.000Z');
    const fixture = await createFixture(prisma, {
      startsAt: classStartsAt,
      now: bookedAt,
    });
    const host = await prisma.client.create({
      data: { name: 'Anfitriona', referralCode: `REF-${randomUUID()}` },
    });
    const friend = await prisma.client.create({
      data: { name: 'Invitada', referralCode: `REF-${randomUUID()}` },
    });
    const friendAccount = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: friend.id },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: friend.id,
        authorAccountId: fixture.accountId,
        now: bookedAt,
      }),
    );
    const repository = createCatalogRepository(prisma);
    const read = () =>
      repository.findActiveSubscription(friend.id, new Date('2026-09-23'));

    await expect(read()).resolves.toMatchObject({
      guestPass: { usedClassStartsAt: null },
    });

    const commands = new PrismaBookingCommands(prisma, () => bookedAt);
    const principal = {
      accountId: friendAccount.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: friend.id },
    };
    const booked = await commands.create(
      { sessionId: fixture.sessionId },
      principal,
    );

    await expect(read()).resolves.toMatchObject({
      guestPass: { usedClassStartsAt: classStartsAt },
    });

    await commands.cancel({ bookingId: booked.id }, principal);

    await expect(read()).resolves.toMatchObject({
      guestPass: { usedClassStartsAt: null },
    });
  });

  it('reads no guest pass on a Plan', async () => {
    const plan = await prisma.subscription.findFirstOrThrow({
      where: { planNameSnapshot: 'Paquete de 8 clases', state: 'ACTIVE' },
      select: { clientId: true, startsOn: true },
    });

    const subscription = await createCatalogRepository(
      prisma,
    ).findActiveSubscription(plan.clientId, plan.startsOn);

    expect(subscription).toMatchObject({ guestPass: null });
  });
});
