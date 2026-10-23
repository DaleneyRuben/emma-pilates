import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const now = new Date('2026-09-21T15:00:00.000Z');

// BKM-014, decisions §5.3: the host's +1 lands once, when the friend's first
// real Payment is approved, on her current Subscription or owed to her next.
describe('guest pass reward', () => {
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

  const administrator = async () => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true, staffMemberId: true },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      select: { id: true },
    });
    return { account, branchId: branch.id };
  };

  const pay = async (clientId: string) => {
    const staff = await administrator();
    const plan = await prisma.plan.findFirstOrThrow({
      where: { name: 'Paquete de 8 clases' },
      select: { id: true },
    });
    return createPrismaPaymentCommands(prisma, {
      now: () => now,
      // PAY-005 removes the Bs 60 award. Until #157 merges the confirmation
      // still writes it, and the check requires it to be positive.
      referralRewardCentavos: 6000,
    }).recordCashPayment(
      { clientId, planId: plan.id, branchId: staff.branchId },
      {
        accountId: staff.account.id,
        authenticationSessionId: randomUUID(),
        identity: {
          kind: 'staff',
          staffMemberId: staff.account.staffMemberId!,
          role: 'administrator',
          branchIds: [],
        },
      },
      randomUUID(),
    );
  };

  const rewards = (clientId: string) =>
    prisma.allowanceAdjustment.count({
      where: { clientId, reason: 'INVITE_CONVERTED', deletedAt: null },
    });

  it("applies the host's reward once, on her current Subscription", async () => {
    const sofia = await prisma.client.findFirstOrThrow({
      where: { name: 'Sofía Guzmán', deletedAt: null },
      select: { id: true },
    });
    const mariana = await prisma.account.findFirstOrThrow({
      where: { email: 'mariana@example.com', deletedAt: null },
      select: { clientId: true },
    });

    await pay(mariana.clientId!);

    await expect(rewards(sofia.id)).resolves.toBe(1);
    await pay(mariana.clientId!);
    await expect(rewards(sofia.id)).resolves.toBe(1);
  });
});
