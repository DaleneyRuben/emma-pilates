import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdministratorPayments } from '../../src/booking/payments/prisma-administrator-payments';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const at = (time: string) => new Date(`2026-09-21T${time}:00.000Z`);

// The development fixtures record only cash Payments, so every transfer
// below is the whole transfer list; Sofía starts with Bs 60 of Credit.
describe('Administrator Payment list (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let administrator: AuthenticatedPrincipal;
  const fixtures = buildDevelopmentFixtures({ today });
  const plan = fixtures.plans.find((p) => p.name === 'Paquete de 8 clases')!;
  const ledger = () => createPrismaAdministratorPayments(prisma);
  const commands = (clock: Date) =>
    createPrismaPaymentCommands(prisma, {
      now: () => clock,
    });
  const paymentIds: Record<string, string> = {};

  const principalOf = async (
    email: string,
  ): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: { id: true, clientId: true, staffMember: true },
    });
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity:
        account.staffMember === null
          ? { kind: 'client', clientId: account.clientId! }
          : {
              kind: 'staff',
              staffMemberId: account.staffMember.id,
              role: 'administrator',
              branchIds: [],
            },
    };
  };

  const newClient = async (name: string) => {
    const email = `${randomUUID()}@example.com`;
    await prisma.account.create({
      data: {
        email,
        activatedAt: at('08:00'),
        emailVerifiedAt: at('08:00'),
        client: { create: { name, referralCode: randomUUID().slice(0, 8) } },
      },
    });
    return principalOf(email);
  };

  // A Client raises a transfer through the real commands (PAY-002).
  const submitTransfer = async (
    principal: AuthenticatedPrincipal,
    submittedAt: Date,
  ) => {
    const openedAt = new Date(submittedAt.getTime() - 30 * 60 * 1_000);
    const receipt = await prisma.imageAsset.create({
      data: {
        ownerAccountId: principal.accountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: `pending/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: openedAt,
        expiresAt: new Date(openedAt.getTime() + 15 * 60 * 1_000),
        finalizedAt: openedAt,
      },
      select: { id: true },
    });
    const intent = await commands(openedAt).createPurchaseIntent(
      { planId: plan.id },
      principal,
      randomUUID(),
    );
    await commands(openedAt).attachReceipt(
      { purchaseIntentId: intent.id, imageAssetId: receipt.id },
      principal,
      randomUUID(),
    );
    const payment = await commands(submittedAt).submitTransfer(
      { purchaseIntentId: intent.id },
      principal,
      randomUUID(),
    );
    return { paymentId: payment.id, receiptId: receipt.id };
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
      now: () => at('08:00'),
    });
    administrator = await principalOf('paola.mendoza@example.com');

    const lucia = await newClient('Lucía Fernández');
    paymentIds.lucia = (await submitTransfer(lucia, at('13:00'))).paymentId;
    const sofia = await principalOf('sofia@example.com');
    paymentIds.sofia = (await submitTransfer(sofia, at('14:00'))).paymentId;

    const valeria = await newClient('Valeria Quiroga');
    paymentIds.valeria = (await submitTransfer(valeria, at('09:00'))).paymentId;
    await commands(at('15:00')).confirmTransfer(
      { paymentId: paymentIds.valeria },
      administrator,
    );

    const mariana = await newClient('Mariana Paz');
    const rejected = await submitTransfer(mariana, at('10:00'));
    paymentIds.mariana = rejected.paymentId;
    await commands(at('16:00')).rejectTransfer(
      { paymentId: rejected.paymentId, reason: 'El monto no coincide.' },
      administrator,
    );
    // The retention sweep later deletes a decided receipt (ADR-0075).
    await prisma.imageAsset.update({
      where: { id: rejected.receiptId },
      data: { deletedAt: at('22:00') },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('lists only transfers, pending ones oldest first and then the decided ones newest first', async () => {
    const page = await ledger().list({ page: 1, pageSize: 20, status: 'all' });

    expect(page).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 4,
      pendingCount: 2,
    });
    expect(page.items.map((item) => item.id)).toEqual([
      paymentIds.lucia,
      paymentIds.sofia,
      paymentIds.mariana,
      paymentIds.valeria,
    ]);
    expect(page.items[1]).toEqual({
      id: paymentIds.sofia,
      clientId: expect.any(String) as string,
      clientName: expect.stringMatching(/^Sofía/) as string,
      planName: 'Paquete de 8 clases',
      planPriceCentavos: plan.priceCentavos,
      creditAppliedCentavos: 0,
      amountDueCentavos: plan.priceCentavos,
      state: 'pending',
      submittedAt: at('14:00'),
      decidedAt: null,
      receiptAvailable: true,
    });
    expect(page.items[2]).toMatchObject({
      clientName: 'Mariana Paz',
      state: 'rejected',
      decidedAt: at('16:00'),
      receiptAvailable: false,
    });
    expect(page.items[3]).toMatchObject({
      state: 'confirmed',
      decidedAt: at('15:00'),
    });
  });

  it.each([
    ['pending', ['lucia', 'sofia']],
    ['confirmed', ['valeria']],
    ['rejected', ['mariana']],
  ] as const)(
    'filters by the %s state and still counts every pending transfer',
    async (status, names) => {
      const page = await ledger().list({ page: 1, pageSize: 20, status });

      expect(page.items.map((item) => item.id)).toEqual(
        names.map((name) => paymentIds[name]),
      );
      expect(page.totalItems).toBe(names.length);
      expect(page.pendingCount).toBe(2);
    },
  );

  it('finds a Client by name ignoring accents and case', async () => {
    const page = await ledger().list({
      page: 1,
      pageSize: 20,
      status: 'all',
      query: 'LUCIA FERNANDEZ',
    });

    expect(page.items.map((item) => item.id)).toEqual([paymentIds.lucia]);
    expect(page).toMatchObject({ totalItems: 1, pendingCount: 2 });
  });

  it('treats the search’s own wildcards literally', async () => {
    const page = await ledger().list({
      page: 1,
      pageSize: 20,
      status: 'all',
      query: '%',
    });

    expect(page).toMatchObject({ items: [], totalItems: 0 });
  });

  it('pages after filtering and ordering', async () => {
    const page = await ledger().list({ page: 2, pageSize: 1, status: 'all' });

    expect(page.items.map((item) => item.id)).toEqual([paymentIds.sofia]);
    expect(page).toMatchObject({ page: 2, pageSize: 1, totalItems: 4 });
  });
});
