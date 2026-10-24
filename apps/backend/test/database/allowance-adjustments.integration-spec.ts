import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { recordAllowanceAdjustment } from '../../src/booking/payments/allowance-adjustments';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const now = new Date('2026-09-21T15:00:00.000Z');

describe('allowance adjustments', () => {
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

  const lucia = async () => {
    const client = await prisma.client.findFirstOrThrow({
      where: { name: 'Lucía Fernández', deletedAt: null },
      select: {
        id: true,
        subscriptions: {
          where: { state: 'ACTIVE' },
          select: { id: true },
          take: 1,
        },
      },
    });
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    return {
      clientId: client.id,
      subscriptionId: client.subscriptions[0].id,
      authorAccountId: author.id,
    };
  };

  it('records an adjustment with its audit and refuses a second live gift', async () => {
    const ids = await lucia();

    const recorded = await prisma.$transaction((transaction) =>
      recordAllowanceAdjustment(transaction, {
        ...ids,
        classes: 1,
        reason: 'gift_new_client',
        author: { accountId: ids.authorAccountId, role: 'ADMINISTRATOR' },
        now,
        correlationId: randomUUID(),
      }),
    );

    expect(recorded).toMatchObject({ classes: 1, reason: 'gift_new_client' });
    await expect(
      prisma.auditRecord.findFirst({
        where: { targetId: recorded.id },
        select: { actionCode: true, metadata: true },
      }),
    ).resolves.toMatchObject({
      actionCode: 'allowance_adjustment.recorded',
      metadata: {
        clientId: ids.clientId,
        classes: 1,
        reason: 'gift_new_client',
      },
    });

    await expect(
      prisma.$transaction((transaction) =>
        recordAllowanceAdjustment(transaction, {
          ...ids,
          classes: 1,
          reason: 'gift_new_client',
          author: { accountId: ids.authorAccountId, role: 'ADMINISTRATOR' },
          now,
          correlationId: randomUUID(),
        }),
      ),
    ).rejects.toThrow();
  });

  it('grants the gift once on the first real Payment and not on the next', async () => {
    const mariana = await prisma.account.findFirstOrThrow({
      where: { email: 'sofia@example.com', deletedAt: null },
      select: { id: true, clientId: true },
    });
    const plan = await prisma.plan.findFirstOrThrow({
      where: { name: 'Paquete de 8 clases' },
      select: { id: true },
    });
    const administrator = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true, staffMemberId: true },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      select: { id: true },
    });
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => now,
    });
    const pay = () =>
      commands.recordCashPayment(
        {
          clientId: mariana.clientId!,
          planId: plan.id,
          branchId: branch.id,
        },
        {
          accountId: administrator.id,
          authenticationSessionId: randomUUID(),
          identity: {
            kind: 'staff',
            staffMemberId: administrator.staffMemberId!,
            role: 'administrator',
            branchIds: [],
          },
        },
        randomUUID(),
      );
    const gifts = () =>
      prisma.allowanceAdjustment.count({
        where: {
          clientId: mariana.clientId!,
          reason: 'GIFT_NEW_CLIENT',
          deletedAt: null,
        },
      });

    await pay();
    await expect(gifts()).resolves.toBe(1);
    // The first sale leaves an effective Subscription; end it so a second
    // real Payment can be confirmed, which must not grant the gift again.
    await prisma.subscription.updateMany({
      where: { clientId: mariana.clientId!, state: 'ACTIVE' },
      data: { state: 'EXPIRED', expiredAt: now },
    });
    await pay();
    await expect(gifts()).resolves.toBe(1);
  });
});
