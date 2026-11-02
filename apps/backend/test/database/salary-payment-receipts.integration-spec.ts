import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaSalaryPayments } from '../../src/back-office/payroll/prisma-salary-payments';
import { createPrismaSalaryReceipts } from '../../src/back-office/payroll/prisma-salary-receipts';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof BackOfficeError) return error.code;
    return String(error);
  }
};

const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);

// BKO-008: the photo of the transfer the Administrator attaches in Nómina,
// read back by her and by the Trainer the payment is for, nobody else.
describe('Salary Payment receipts', () => {
  let world: EvaluationTestWorld;
  const payroll = () =>
    createPrismaSalaryPayments(world.prisma, { now: () => fixtureNow });
  const receipts = () => createPrismaSalaryReceipts(world.prisma);
  const principalOf = (email: string) => world.principalOf(email);
  const staffIdOf = async (email: string) =>
    (
      await world.prisma.account.findFirstOrThrow({
        where: { email, deletedAt: null },
        select: { staffMemberId: true },
      })
    ).staffMemberId!;

  const readyReceipt = async (
    ownerAccountId: string,
    state: 'READY' | 'PENDING' = 'READY',
  ) => {
    const created = new Date(fixtureNow.getTime() - 60 * 60 * 1_000);
    return world.prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose: 'TRANSFER_RECEIPT',
        state,
        pendingObjectKey: `pending/transfer_receipt/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 10,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 3)),
        verifiedMediaType: 'JPEG',
        verifiedByteSize: 10,
        verifiedChecksum: toPrismaBytes(Buffer.alloc(32, 3)),
        verifiedWidth: 1200,
        verifiedHeight: 1600,
        createdAt: created,
        expiresAt: new Date(created.getTime() + 15 * 60 * 1_000),
        finalizedAt: new Date(created.getTime() + 5 * 60 * 1_000),
        deletionDueAt: new Date(created.getTime() + 24 * 60 * 60 * 1_000),
        variants: {
          create: (['READABLE', 'THUMBNAIL'] as const).map((kind) => ({
            kind,
            visibility: 'PRIVATE',
            storageKey: `private/transfer_receipt/${randomUUID()}/${kind.toLowerCase()}`,
            mediaType: 'WEBP',
            byteSize: 3,
            width: 600,
            height: 800,
          })),
        },
      },
      include: { variants: true },
    });
  };

  const record = async (receiptImageAssetId?: string) =>
    payroll().recordSalaryPayment(
      {
        staffMemberId: await staffIdOf('emma.vargas@example.com'),
        amountCentavos: 32_200,
        paidOn: civil('2026-09-20'),
        ...(receiptImageAssetId === undefined ? {} : { receiptImageAssetId }),
      },
      await principalOf('paola.mendoza@example.com'),
      randomUUID(),
    );

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('records a payment with its receipt and attaches the photo', async () => {
    const admin = await principalOf('paola.mendoza@example.com');
    const photo = await readyReceipt(admin.accountId);

    const payment = await record(photo.id);

    expect(payment.receiptImageAssetId).toBe(photo.id);
    await expect(
      world.prisma.imageAsset.findUniqueOrThrow({
        where: { id: photo.id },
        select: { state: true },
      }),
    ).resolves.toEqual({ state: 'ATTACHED' });
    const audit = await world.prisma.auditRecord.findFirstOrThrow({
      where: { targetId: payment.id },
      select: { metadata: true },
    });
    expect(audit.metadata).toMatchObject({ receiptImageAssetId: photo.id });
  });

  it('attaches a receipt later and keeps the one it replaces', async () => {
    const admin = await principalOf('paola.mendoza@example.com');
    const payment = await record();
    expect(payment.receiptImageAssetId).toBeNull();
    const first = await readyReceipt(admin.accountId);
    const second = await readyReceipt(admin.accountId);
    const edit = (receiptImageAssetId: string) =>
      payroll().updateSalaryPayment(
        {
          salaryPaymentId: payment.id,
          staffMemberId: payment.staffMemberId,
          amountCentavos: payment.amountCentavos,
          paidOn: payment.paidOn,
          receiptImageAssetId,
        },
        admin,
      );

    await expect(edit(first.id)).resolves.toMatchObject({
      receiptImageAssetId: first.id,
    });
    await expect(edit(second.id)).resolves.toMatchObject({
      receiptImageAssetId: second.id,
    });

    const kept = await world.prisma.imageAsset.findUniqueOrThrow({
      where: { id: first.id },
      select: { state: true, deleteRequestedAt: true },
    });
    expect(kept).toEqual({ state: 'ATTACHED', deleteRequestedAt: null });
    const audits = await world.prisma.auditRecord.findMany({
      where: { targetId: payment.id, actionCode: 'salary_payment.updated' },
      orderBy: { occurredAt: 'asc' },
      select: { metadata: true },
    });
    expect(audits.at(-1)?.metadata).toMatchObject({
      previousReceiptImageAssetId: first.id,
      receiptImageAssetId: second.id,
    });
  });

  it('refuses a photo that is not ready or was not uploaded by her', async () => {
    const admin = await principalOf('paola.mendoza@example.com');
    const assistant = await principalOf('camila.rojas@example.com');

    await expect(
      codeOf(record((await readyReceipt(admin.accountId, 'PENDING')).id)),
    ).resolves.toBe('salary_receipt_not_ready');
    await expect(
      codeOf(record((await readyReceipt(assistant.accountId)).id)),
    ).resolves.toBe('salary_receipt_not_ready');
  });

  it('serves the receipt to the Administrator and the Trainer it pays only', async () => {
    const admin = await principalOf('paola.mendoza@example.com');
    const photo = await readyReceipt(admin.accountId);
    const payment = await record(photo.id);
    const readable = photo.variants.find((v) => v.kind === 'READABLE')!;
    const thumbnail = photo.variants.find((v) => v.kind === 'THUMBNAIL')!;
    const command = {
      salaryPaymentId: payment.id,
      variant: 'readable' as const,
    };
    const any = async (email: string) =>
      receipts().readAnySalaryReceipt(command, await principalOf(email));
    const own = async (email: string) =>
      receipts().readOwnSalaryReceipt(command, await principalOf(email));

    // Nómina: the Administrator only.
    await expect(any('paola.mendoza@example.com')).resolves.toEqual({
      objectKey: readable.storageKey,
      mediaType: 'image/webp',
    });
    for (const email of [
      'emma.vargas@example.com',
      'camila.rojas@example.com',
      'carolina.rivas@example.com',
    ]) {
      await expect(codeOf(any(email))).resolves.toBe(
        'back_office_access_denied',
      );
    }

    // «Mis pagos»: the Trainer it pays; another Trainer finds nothing.
    await expect(
      receipts().readOwnSalaryReceipt(
        { salaryPaymentId: payment.id, variant: 'thumbnail' },
        await principalOf('emma.vargas@example.com'),
      ),
    ).resolves.toEqual({
      objectKey: thumbnail.storageKey,
      mediaType: 'image/webp',
    });
    await expect(codeOf(own('daniela.ortiz@example.com'))).resolves.toBe(
      'salary_payment_not_found',
    );
    for (const email of [
      'paola.mendoza@example.com',
      'camila.rojas@example.com',
      'carolina.rivas@example.com',
      'lucia@example.com',
    ]) {
      await expect(codeOf(own(email))).resolves.toBe(
        'back_office_access_denied',
      );
    }

    const bare = await record();
    await expect(
      codeOf(
        receipts().readAnySalaryReceipt(
          { salaryPaymentId: bare.id, variant: 'readable' },
          admin,
        ),
      ),
    ).resolves.toBe('salary_receipt_not_found');
    const ownPayments = await payroll().listOwnSalaryPayments(
      await principalOf('emma.vargas@example.com'),
    );
    expect(ownPayments.find((row) => row.id === payment.id)).toMatchObject({
      receiptImageAssetId: photo.id,
    });
  });
});
