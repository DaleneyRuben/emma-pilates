import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdministratorPayments } from '../../src/booking/payments/prisma-administrator-payments';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { createPrismaVoidPayment } from '../../src/booking/payments/prisma-void-payment';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T15:00:00.000Z');

// PAY-006: a voided sale stays on the Administrator's payment list with its
// reason, including a cash sale the transfer review never showed.
describe('voided sale on the Administrator payment list (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let administrator: AuthenticatedPrincipal;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures: buildDevelopmentFixtures({ today }),
      passwordHash: 'not-a-real-hash',
      now: () => today,
    });
    const account = await prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      select: { id: true, staffMember: { select: { id: true } } },
    });
    administrator = {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: account.staffMember!.id,
        role: 'administrator',
        branchIds: [],
      },
    };
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('keeps a voided cash sale visible with its reason', async () => {
    const client = await prisma.client.findFirstOrThrow({
      where: { name: { startsWith: 'Lucía' } },
      select: { id: true },
    });
    const plan = await prisma.plan.findFirstOrThrow({
      where: { name: 'Paquete de 8 clases' },
      select: { id: true },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      select: { id: true },
    });
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => today,
      referralRewardCentavos: 0,
    });
    const sale = await commands.recordCashPayment(
      { clientId: client.id, planId: plan.id, branchId: branch.id },
      administrator,
      randomUUID(),
    );
    await createPrismaVoidPayment(prisma).voidPayment({
      paymentId: sale.id,
      reason: 'Se registró el plan equivocado',
      actorAccountId: administrator.accountId,
      now: today,
    });

    const page = await createPrismaAdministratorPayments(prisma).list({
      page: 1,
      pageSize: 20,
      status: 'voided',
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        id: sale.id,
        state: 'voided',
        voidReason: 'Se registró el plan equivocado',
      }),
    ]);
    expect(page.pendingCount).toBe(0);
  });
});
