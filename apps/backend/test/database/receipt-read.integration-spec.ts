import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { createPrismaReceiptRead } from '../../src/booking/payments/prisma-receipt-read';
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

// UPL-002: the receipt route serves the rebuilt variant that fits the screen
// (ADR-0073) and falls back to the original for receipts finalized before
// variants existed.
describe('Administrator receipt read (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let administrator: AuthenticatedPrincipal;
  let trainer: AuthenticatedPrincipal;
  const fixtures = buildDevelopmentFixtures({ today });
  const plan = fixtures.plans.find((p) => p.name === 'Paquete de 8 clases')!;
  const commands = (clock: Date) =>
    createPrismaPaymentCommands(prisma, {
      now: () => clock,
      referralRewardCentavos: 6000,
    });
  const read = () => createPrismaReceiptRead(prisma);

  const principalOf = async (email: string): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findUniqueOrThrow({
      where: { email },
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
              role:
                account.staffMember.role === 'ADMINISTRATOR'
                  ? 'administrator'
                  : 'trainer',
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

  const submitTransfer = async (
    principal: AuthenticatedPrincipal,
    withVariants: boolean,
  ) => {
    const openedAt = at('12:30');
    const receipt = await prisma.imageAsset.create({
      data: {
        ownerAccountId: principal.accountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: `pending/transfer_receipt/${randomUUID()}`,
        declaredMediaType: 'PNG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: openedAt,
        expiresAt: new Date(openedAt.getTime() + 15 * 60 * 1_000),
        finalizedAt: openedAt,
        variants: withVariants
          ? {
              create: [
                {
                  kind: 'READABLE',
                  visibility: 'PRIVATE',
                  storageKey: `private/transfer_receipt/${randomUUID()}/readable`,
                  mediaType: 'JPEG',
                  byteSize: 900,
                  width: 946,
                  height: 2048,
                },
                {
                  kind: 'THUMBNAIL',
                  visibility: 'PRIVATE',
                  storageKey: `private/transfer_receipt/${randomUUID()}/thumbnail`,
                  mediaType: 'JPEG',
                  byteSize: 300,
                  width: 370,
                  height: 800,
                },
              ],
            }
          : undefined,
      },
      include: { variants: true },
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
    const payment = await commands(at('13:00')).submitTransfer(
      { purchaseIntentId: intent.id },
      principal,
      randomUUID(),
    );
    return { paymentId: payment.id, receipt };
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
    trainer = await principalOf('emma.vargas@example.com');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('serves the readable variant by default and the thumbnail on request', async () => {
    const { paymentId, receipt } = await submitTransfer(
      await newClient('Ana Rojas'),
      true,
    );
    const readable = receipt.variants.find((v) => v.kind === 'READABLE')!;
    const thumbnail = receipt.variants.find((v) => v.kind === 'THUMBNAIL')!;

    await expect(
      read().readReceiptObject({ paymentId, variant: 'readable' }, administrator),
    ).resolves.toEqual({
      objectKey: readable.storageKey,
      mediaType: 'image/jpeg',
    });
    await expect(
      read().readReceiptObject(
        { paymentId, variant: 'thumbnail' },
        administrator,
      ),
    ).resolves.toEqual({
      objectKey: thumbnail.storageKey,
      mediaType: 'image/jpeg',
    });
  });

  it('falls back to the original object for a receipt finalized without variants', async () => {
    const { paymentId, receipt } = await submitTransfer(
      await newClient('Beatriz Soto'),
      false,
    );

    await expect(
      read().readReceiptObject({ paymentId, variant: 'readable' }, administrator),
    ).resolves.toEqual({
      objectKey: receipt.pendingObjectKey,
      mediaType: 'image/png',
    });
  });

  it('refuses everyone but an Administrator and reports a missing or deleted receipt', async () => {
    const { paymentId, receipt } = await submitTransfer(
      await newClient('Carla Vaca'),
      true,
    );

    await expect(
      read().readReceiptObject({ paymentId, variant: 'readable' }, trainer),
    ).rejects.toThrow('Booking access is denied');
    await expect(
      read().readReceiptObject(
        { paymentId: randomUUID(), variant: 'readable' },
        administrator,
      ),
    ).rejects.toMatchObject({ code: 'payment_not_found' });

    await prisma.imageAsset.update({
      where: { id: receipt.id },
      data: { deletedAt: at('14:00'), state: 'DELETED' },
    });
    await expect(
      read().readReceiptObject({ paymentId, variant: 'readable' }, administrator),
    ).rejects.toMatchObject({ code: 'payment_receipt_not_ready' });
  });
});
