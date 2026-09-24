import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdministratorPayments } from '../../src/booking/payments/prisma-administrator-payments';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const at = (time: string) => new Date(`2026-09-21T${time}:00.000Z`);

describe('Administrator Payment list (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let planId: string;
  let branchId: string;
  const ledger = () => createPrismaAdministratorPayments(prisma);
  const ids: Record<string, string> = {};

  const createClient = async (name: string) => {
    const client = await prisma.client.create({
      data: {
        name,
        referralCode: randomUUID(),
        account: { create: { email: `${randomUUID()}@example.com` } },
      },
      select: { id: true, account: { select: { id: true } } },
    });
    return { clientId: client.id, accountId: client.account!.id };
  };

  const snapshot = (priceCentavos: number, creditCentavos: number) => ({
    planNameSnapshot: 'Paquete de 8 clases',
    durationMonthsSnapshot: 1,
    classAllowanceSnapshot: 8,
    planPriceCentavos: priceCentavos,
    amountDueCentavos: priceCentavos - creditCentavos,
  });

  const transfer = async (input: {
    name: string;
    submittedAt: Date;
    state: 'PENDING' | 'CONFIRMED' | 'REJECTED';
    decidedAt?: Date;
    creditCentavos?: number;
    receiptDeleted?: boolean;
  }) => {
    const { clientId, accountId } = await createClient(input.name);
    const credit = input.creditCentavos ?? 0;
    const receipt = await prisma.imageAsset.create({
      data: {
        ownerAccountId: accountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: randomUUID(),
        declaredMediaType: 'JPEG',
        declaredByteSize: 100,
        declaredChecksum: Buffer.alloc(32, 1),
        createdAt: at('08:00'),
        expiresAt: at('23:00'),
        deletedAt: input.receiptDeleted === true ? at('22:00') : null,
      },
    });
    const intent = await prisma.purchaseIntent.create({
      data: {
        clientId,
        planId,
        ...snapshot(56_000, credit),
        creditReservedCentavos: credit,
        receiptImageAssetId: receipt.id,
        state: 'SUBMITTED',
        createdByAccountId: accountId,
        createdAt: at('08:00'),
        expiresAt: new Date('2026-09-22T08:00:00.000Z'),
        submittedAt: input.submittedAt,
      },
    });
    const payment = await prisma.payment.create({
      data: {
        clientId,
        planId,
        purchaseIntentId: intent.id,
        ...snapshot(56_000, credit),
        creditAppliedCentavos: credit,
        method: 'TRANSFER',
        state: input.state,
        submittedByAccountId: accountId,
        submittedAt: input.submittedAt,
        ...(input.state === 'PENDING'
          ? {}
          : { decidedByAccountId: accountId, decidedAt: input.decidedAt }),
        ...(input.state === 'REJECTED'
          ? { rejectionReason: 'El monto no coincide.' }
          : {}),
      },
    });
    ids[input.name] = payment.id;
    return { clientId, paymentId: payment.id };
  };

  // Cash and Credit-only Payments are confirmed when recorded (ADR-0006).
  const settledOnTheSpot = async (
    name: string,
    method: 'CASH' | 'CREDIT_ONLY',
  ) => {
    const { clientId, accountId } = await createClient(name);
    const credit = method === 'CASH' ? 0 : 56_000;
    await prisma.payment.create({
      data: {
        clientId,
        planId,
        ...snapshot(56_000, credit),
        creditAppliedCentavos: credit,
        method,
        state: 'CONFIRMED',
        collectedAtBranchId: method === 'CASH' ? branchId : null,
        submittedByAccountId: accountId,
        submittedAt: at('11:00'),
        decidedByAccountId: accountId,
        decidedAt: at('11:00'),
      },
    });
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    planId = (
      await prisma.plan.create({
        data: {
          name: 'Paquete de 8 clases',
          durationMonths: 1,
          classAllowance: 8,
          priceCentavos: 56_000,
          displayOrder: 0,
        },
      })
    ).id;
    branchId = (
      await prisma.branch.create({
        data: { name: 'Centro', address: 'Calle Ayacucho 245' },
      })
    ).id;

    await transfer({
      name: 'Sofía Guzmán',
      submittedAt: at('14:00'),
      state: 'PENDING',
      creditCentavos: 6_000,
    });
    await transfer({
      name: 'Lucía Fernández',
      submittedAt: at('13:00'),
      state: 'PENDING',
    });
    await transfer({
      name: 'Valeria Quiroga',
      submittedAt: at('09:00'),
      state: 'CONFIRMED',
      decidedAt: at('15:00'),
    });
    await transfer({
      name: 'Mariana Paz',
      submittedAt: at('10:00'),
      state: 'REJECTED',
      decidedAt: at('16:00'),
      receiptDeleted: true,
    });
    await settledOnTheSpot('Ana Justiniano', 'CASH');
    await settledOnTheSpot('Bea Montaño', 'CREDIT_ONLY');
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
    expect(page.items.map((item) => item.clientName)).toEqual([
      'Lucía Fernández',
      'Sofía Guzmán',
      'Mariana Paz',
      'Valeria Quiroga',
    ]);
    expect(page.items[1]).toEqual({
      id: ids['Sofía Guzmán'],
      clientId: expect.any(String),
      clientName: 'Sofía Guzmán',
      planName: 'Paquete de 8 clases',
      planPriceCentavos: 56_000,
      creditAppliedCentavos: 6_000,
      amountDueCentavos: 50_000,
      state: 'pending',
      submittedAt: at('14:00'),
      decidedAt: null,
      receiptAvailable: true,
    });
    expect(page.items[2]).toMatchObject({
      state: 'rejected',
      decidedAt: at('16:00'),
      receiptAvailable: false,
    });
  });

  it.each([
    ['pending', ['Lucía Fernández', 'Sofía Guzmán']],
    ['confirmed', ['Valeria Quiroga']],
    ['rejected', ['Mariana Paz']],
  ] as const)(
    'filters by the %s state and still counts every pending transfer',
    async (status, names) => {
      const page = await ledger().list({ page: 1, pageSize: 20, status });

      expect(page.items.map((item) => item.clientName)).toEqual(names);
      expect(page.totalItems).toBe(names.length);
      expect(page.pendingCount).toBe(2);
    },
  );

  it('finds a Client by name ignoring accents and case', async () => {
    const page = await ledger().list({
      page: 1,
      pageSize: 20,
      status: 'all',
      query: 'GUZMAN',
    });

    expect(page.items.map((item) => item.clientName)).toEqual(['Sofía Guzmán']);
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

    expect(page.items.map((item) => item.clientName)).toEqual(['Sofía Guzmán']);
    expect(page).toMatchObject({ page: 2, pageSize: 1, totalItems: 4 });
  });
});
