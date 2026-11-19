import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { createPrismaAdministratorClients } from '../../src/booking/clients/prisma-administrator-clients';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { recordAllowanceAdjustment } from '../../src/booking/payments/allowance-adjustments';
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
const classDay = new Date('2026-09-23');
const bookedAt = new Date('2026-09-23T15:00:00.000Z');

// Walkthrough n.º 60 and 61: a host's live extra classes count with her
// Plan, and a spent Guest Pass gives way to the Plan bought after it.
describe('plan summary with extra classes and the Plan after a Guest Pass', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let host: { id: string };
  let friend: { id: string };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures: buildDevelopmentFixtures({ today }),
      passwordHash: 'not-a-real-hash',
    });
    const fixture = await createFixture(prisma, {
      startsAt: new Date('2026-09-23T20:00:00.000Z'),
      now: bookedAt,
    });
    host = await prisma.client.create({
      data: { name: 'Anfitriona Extra', referralCode: `REF-${randomUUID()}` },
    });
    const hostPlan = await prisma.plan.findFirstOrThrow({
      where: { name: 'Paquete de 8 clases' },
      select: { id: true },
    });
    const hostSubscription = await prisma.subscription.create({
      data: {
        clientId: host.id,
        planId: hostPlan.id,
        planNameSnapshot: 'Paquete de 8 clases',
        durationDaysSnapshot: 30,
        originalClassAllowance: 8,
        remainingClassAllowance: 8,
        startsOn: new Date('2026-09-20'),
        endsOn: new Date('2026-10-19'),
        activatedAt: bookedAt,
      },
    });
    await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: host.id },
    });
    await prisma.$transaction((transaction) =>
      recordAllowanceAdjustment(transaction, {
        subscriptionId: hostSubscription.id,
        clientId: host.id,
        classes: 1,
        reason: 'invite_converted',
        author: { accountId: fixture.accountId, role: null },
        now: bookedAt,
        correlationId: randomUUID(),
      }),
    );

    friend = await prisma.client.create({
      data: { name: 'Invitada Pagada', referralCode: `REF-${randomUUID()}` },
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
    await new PrismaBookingCommands(prisma, () => bookedAt).create(
      { sessionId: fixture.sessionId },
      {
        accountId: friendAccount.id,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: friend.id },
      },
    );
    await prisma.subscription.create({
      data: {
        clientId: friend.id,
        planId: hostPlan.id,
        planNameSnapshot: 'Paquete de 8 clases',
        durationDaysSnapshot: 30,
        originalClassAllowance: 8,
        remainingClassAllowance: 8,
        startsOn: new Date('2026-09-24'),
        endsOn: new Date('2026-10-23'),
        activatedAt: bookedAt,
      },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('counts live extra classes on the Client subscription summary', async () => {
    const repository = createCatalogRepository(prisma);

    await expect(
      repository.findActiveSubscription(host.id, classDay),
    ).resolves.toMatchObject({ remainingClassAllowance: 8, extraClasses: 1 });
  });

  it('lists the host with her extras and the friend with the Plan she bought', async () => {
    const page = await createPrismaAdministratorClients(prisma).list({
      page: 1,
      pageSize: 50,
      query: 'Extra',
      today: classDay,
      now: classDay,
    });
    expect(page.items).toEqual([
      expect.objectContaining({
        id: host.id,
        remainingClassAllowance: 8,
        extraClasses: 1,
        planStartsOn: null,
      }),
    ]);

    const friends = await createPrismaAdministratorClients(prisma).list({
      page: 1,
      pageSize: 50,
      query: 'Invitada Pagada',
      today: classDay,
      now: classDay,
    });
    expect(friends.items).toEqual([
      expect.objectContaining({
        id: friend.id,
        planName: 'Paquete de 8 clases',
        subscriptionStatus: 'active',
        remainingClassAllowance: 8,
        originalClassAllowance: 8,
        extraClasses: 0,
        planStartsOn: new Date('2026-09-24'),
        planEndsOn: new Date('2026-10-23'),
      }),
    ]);
  });
});
