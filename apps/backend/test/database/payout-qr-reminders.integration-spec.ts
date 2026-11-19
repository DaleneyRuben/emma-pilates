import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { createPayoutQrReminderJob } from '../../src/back-office/payout-qr/payout-qr-reminder-job';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// 2026-12-08 at 10:00 and 08:00 in La Paz.
const morning = new Date('2026-12-08T14:00:00.000Z');
const beforeNine = new Date('2026-12-08T12:00:00.000Z');
const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);

// FIX-072: the worker's payout QR reminders, once per QR, to people who can
// still sign in, and only for the current QR.
describe('payout QR reminders (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const memberWithQr = async (
    validUntil: string,
    options: { disabled?: boolean; replaced?: boolean } = {},
  ) => {
    const member = await prisma.staffMember.create({
      data: { name: 'Daniela Ortiz', role: 'TRAINER' },
    });
    const account = await prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        staffMemberId: member.id,
        activatedAt: morning,
        disabledAt: options.disabled ? morning : null,
      },
    });
    const asset = await prisma.imageAsset.create({
      data: {
        ownerAccountId: account.id,
        purpose: 'PAYOUT_QR',
        state: 'ATTACHED',
        pendingObjectKey: `pending/payout_qr/${randomUUID()}`,
        declaredMediaType: 'PNG',
        declaredByteSize: 10,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        expiresAt: morning,
      },
    });
    const qr = await prisma.staffPayoutQr.create({
      data: {
        staffMemberId: member.id,
        imageAssetId: asset.id,
        validUntil: civil(validUntil),
        uploadedByAccountId: account.id,
        replacedAt: options.replaced ? morning : null,
      },
    });
    return { accountId: account.id, qrId: qr.id };
  };

  const remindersOf = (accountId: string) =>
    prisma.notification.findMany({
      where: { accountId },
      select: {
        type: true,
        businessEventKey: true,
        message: true,
        destinationType: true,
        destinationId: true,
        createdAt: true,
      },
    });

  it('reminds each current QR once, after nine in the morning', async () => {
    const soon = await memberWithQr('2026-12-15');
    const later = await memberWithQr('2026-12-16');
    const gone = await memberWithQr('2026-12-07');
    const disabled = await memberWithQr('2026-12-10', { disabled: true });
    const replaced = await memberWithQr('2026-12-10', { replaced: true });

    await expect(
      createPayoutQrReminderJob(prisma, () => beforeNine).execute(),
    ).resolves.toEqual({ reminded: 0 });
    const job = createPayoutQrReminderJob(prisma, () => morning);
    await expect(job.execute()).resolves.toEqual({ reminded: 2 });
    await expect(job.execute()).resolves.toEqual({ reminded: 0 });

    await expect(remindersOf(soon.accountId)).resolves.toEqual([
      {
        type: 'payout_qr_expiring',
        businessEventKey: `payout-qr-expiring:${soon.qrId}`,
        message: 'Tu QR de cobro vence el mar 15 dic, sube uno nuevo.',
        destinationType: 'payout_qr',
        destinationId: soon.qrId,
        createdAt: new Date('2026-12-08T13:00:00.000Z'),
      },
    ]);
    await expect(remindersOf(gone.accountId)).resolves.toEqual([
      expect.objectContaining({
        type: 'payout_qr_expired',
        message:
          'Tu QR de cobro venció el lun 7 dic, sube uno nuevo para que podamos pagarte.',
      }),
    ]);
    for (const quiet of [later, disabled, replaced]) {
      await expect(remindersOf(quiet.accountId)).resolves.toEqual([]);
    }
  });

  // FIX-090 (audit S10): once the QR has expired, the earlier «vence pronto»
  // notice is settled, so the two never contradict each other.
  it('settles the expiring notice when the expired one arrives', async () => {
    const gone = await memberWithQr('2026-12-07');
    const lastWeek = new Date('2026-12-01T13:00:00.000Z');
    await prisma.notification.create({
      data: {
        accountId: gone.accountId,
        category: 'REMINDER',
        type: 'payout_qr_expiring',
        businessEventKey: `payout-qr-expiring:${gone.qrId}`,
        title: 'Tu QR de cobro vence pronto',
        message: 'Tu QR de cobro vence el lun 7 dic, sube uno nuevo.',
        createdAt: lastWeek,
      },
    });

    await createPayoutQrReminderJob(prisma, () => morning).execute();

    const notices = await prisma.notification.findMany({
      where: { accountId: gone.accountId },
      orderBy: { createdAt: 'asc' },
      select: { type: true, readAt: true },
    });
    expect(notices).toEqual([
      {
        type: 'payout_qr_expiring',
        readAt: new Date('2026-12-08T13:00:00.000Z'),
      },
      { type: 'payout_qr_expired', readAt: null },
    ]);
  });
});
