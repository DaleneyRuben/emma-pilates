import { randomUUID } from 'node:crypto';
import { createPrismaAccountClosure } from '../../src/booking/account-closure/prisma-account-closure';
import { createPrismaInvoiceData } from '../../src/booking/payments/invoice-data/prisma-invoice-data';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import {
  closureNow,
  closurePassword,
  ClosureClient,
  ClosureWorld,
  startClosureWorld,
} from './account-closure-test-support';

// BE-021 and BE-020 on real PostgreSQL: closing a Client Account erases the
// personal data on its rows, and a ticked promotions box keeps an unlinked
// Promotion Contact (ADR-0097).
const anHourBefore = new Date(closureNow.getTime() - 60 * 60 * 1_000);
const aDayAfter = new Date(closureNow.getTime() + 24 * 60 * 60 * 1_000);

describe('erasing a closed Client Account (PostgreSQL)', () => {
  let world: ClosureWorld;
  const closure = () =>
    createPrismaAccountClosure(world.prisma, { now: () => closureNow });

  beforeAll(async () => {
    world = await startClosureWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const withProfilePhoto = async (client: ClosureClient) => {
    const asset = await world.prisma.imageAsset.create({
      data: {
        ownerAccountId: client.accountId,
        purpose: 'PROFILE_PHOTO',
        state: 'ATTACHED',
        pendingObjectKey: `pending/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1_000,
        declaredChecksum: Buffer.alloc(32),
        createdAt: anHourBefore,
        expiresAt: aDayAfter,
        finalizedAt: anHourBefore,
        attachedAt: anHourBefore,
      },
      select: { id: true },
    });
    await world.prisma.client.update({
      where: { id: client.clientId },
      data: { profileImageAssetId: asset.id },
    });
    return asset.id;
  };

  const personalData = (client: ClosureClient) =>
    Promise.all([
      world.prisma.client.findUniqueOrThrow({
        where: { id: client.clientId },
        select: { name: true, phone: true, profileImageAssetId: true },
      }),
      world.prisma.account.findUniqueOrThrow({
        where: { id: client.accountId },
        select: { email: true, passwordHash: true },
      }),
    ]);

  it('erases the name, phone, email, password, and profile photo', async () => {
    const ana = await world.newClient('Ana Justiniano');
    const photoId = await withProfilePhoto(ana);

    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    const [client, account] = await personalData(ana);
    expect(client).toEqual({
      name: 'Cliente eliminado',
      phone: null,
      profileImageAssetId: null,
    });
    expect(account).toEqual({
      email: `cerrada-${ana.accountId}@cuentas-cerradas.invalid`,
      passwordHash: null,
    });
    // ADR-0076: detached, so the sweep deletes the bytes.
    await expect(
      world.prisma.imageAsset.findUniqueOrThrow({
        where: { id: photoId },
        select: { deleteRequestedAt: true },
      }),
    ).resolves.toEqual({ deleteRequestedAt: closureNow });
  });

  it('erases the address of a pending email change', async () => {
    const ana = await world.newClient('Ana Justiniano');
    const token = await world.prisma.authenticationToken.create({
      data: {
        accountId: ana.accountId,
        purpose: 'EMAIL_CHANGE',
        tokenDigest: Buffer.from(randomUUID()),
        issuedAt: anHourBefore,
        expiresAt: aDayAfter,
      },
    });
    await world.prisma.accountEmailChange.create({
      data: {
        accountId: ana.accountId,
        newEmail: `${randomUUID()}@example.com`,
        authenticationTokenId: token.id,
        requestedAt: anHourBefore,
        expiresAt: aDayAfter,
      },
    });

    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    await expect(
      world.prisma.accountEmailChange.findMany({
        where: { accountId: ana.accountId },
        select: { newEmail: true },
      }),
    ).resolves.toEqual([
      { newEmail: `cerrada-${ana.accountId}@cuentas-cerradas.invalid` },
    ]);
  });

  it('erases the Invoice Data on her sales and keeps the sales and the «Factura emitida» mark (PAY-007)', async () => {
    const ana = await world.newClient('Ana Justiniano', {
      subscription: false,
    });
    const plan = await world.prisma.plan.findFirstOrThrow({
      where: { hiddenAt: null },
      orderBy: { displayOrder: 'asc' },
    });
    const branch = await world.prisma.branch.findFirstOrThrow();
    const sale = await createPrismaPaymentCommands(world.prisma, {
      now: () => anHourBefore,
    }).recordCashPayment(
      {
        clientId: ana.clientId,
        planId: plan.id,
        branchId: branch.id,
        invoiceData: { taxId: '4567891', name: 'Ana Justiniano' },
      },
      world.administrator,
      randomUUID(),
    );
    await createPrismaInvoiceData(world.prisma).setIssued({
      paymentId: sale.id,
      issued: true,
      principal: world.administrator,
      now: anHourBefore,
    });

    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    await expect(
      world.prisma.payment.findUniqueOrThrow({
        where: { id: sale.id },
        select: {
          state: true,
          invoiceTaxId: true,
          invoiceName: true,
          invoiceIssuedAt: true,
        },
      }),
    ).resolves.toEqual({
      state: 'CONFIRMED',
      invoiceTaxId: null,
      invoiceName: null,
      invoiceIssuedAt: anHourBefore,
    });
  });

  it('erases the Client an Administrator closes too', async () => {
    const ana = await world.newClient('Ana Justiniano');

    await closure().close({ clientId: ana.clientId }, world.administrator);

    const [client] = await personalData(ana);
    expect(client.name).toBe('Cliente eliminado');
  });

  it('keeps an unlinked Promotion Contact when the Client ticks the box', async () => {
    const ana = await world.newClient('Ana Justiniano');

    await closure().close(
      {
        clientId: ana.clientId,
        password: closurePassword,
        keepPromotions: true,
      },
      ana.principal,
    );

    await expect(
      world.prisma.promotionContact.findMany({
        where: { email: ana.email },
        select: {
          name: true,
          email: true,
          phone: true,
          consentedAt: true,
          withdrawnAt: true,
        },
      }),
    ).resolves.toEqual([
      {
        name: 'Ana Justiniano',
        email: ana.email,
        phone: '+591 70000000',
        consentedAt: closureNow,
        withdrawnAt: null,
      },
    ]);
  });

  it('keeps no Promotion Contact without the box', async () => {
    const ana = await world.newClient('Ana Justiniano');

    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    await expect(
      world.prisma.promotionContact.count({ where: { email: ana.email } }),
    ).resolves.toBe(0);
  });
});
