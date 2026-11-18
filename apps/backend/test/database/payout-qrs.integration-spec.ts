import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { createPrismaPayoutQrs } from '../../src/back-office/payout-qr/prisma-payout-qrs';
import { ImageAssetNotAttachableError } from '../../src/uploads/image-asset-attachments';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-11-18T15:00:00.000Z');
const later = new Date('2026-11-25T15:00:00.000Z');
const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);

// FIX-072: one current payout QR per person; a new one ends the old one and
// releases its photo, keeping the row (ADR-0086).
describe('staff payout QRs (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let gateway: ReturnType<typeof createPrismaPayoutQrs>;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    gateway = createPrismaPayoutQrs(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const staffMember = async () => {
    const member = await prisma.staffMember.create({
      data: { name: 'Daniela Ortiz', role: 'TRAINER' },
    });
    const account = await prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        staffMemberId: member.id,
        activatedAt: now,
      },
    });
    return { staffMemberId: member.id, accountId: account.id };
  };

  const qrUpload = (
    ownerAccountId: string,
    purpose: 'PAYOUT_QR' | 'PROFILE_PHOTO' = 'PAYOUT_QR',
  ) =>
    prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose,
        state: 'READY',
        pendingObjectKey: `pending/payout_qr/${randomUUID()}`,
        declaredMediaType: 'PNG',
        declaredByteSize: 10,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: new Date(now.getTime() - 60_000),
        expiresAt: new Date(now.getTime() + 60_000),
        finalizedAt: new Date(now.getTime() - 30_000),
        variants: {
          create: ['READABLE', 'THUMBNAIL'].map((kind) => ({
            kind: kind as 'READABLE',
            visibility: 'PRIVATE',
            storageKey: `private/payout_qr/${randomUUID()}/${kind.toLowerCase()}`,
            mediaType: 'JPEG',
            byteSize: 3,
            width: 800,
            height: 800,
          })),
        },
      },
      include: { variants: true },
    });

  const actorOf = (accountId: string) => ({
    accountId,
    role: 'TRAINER' as const,
    impersonationId: null,
  });

  it('keeps one current QR and the history of the ones it replaced', async () => {
    const daniela = await staffMember();
    const first = await qrUpload(daniela.accountId);
    const second = await qrUpload(daniela.accountId);

    const kept = await gateway.replace({
      ...daniela,
      imageAssetId: first.id,
      validUntil: civil('2026-12-15'),
      actor: actorOf(daniela.accountId),
      now,
    });
    await expect(gateway.findCurrent(daniela.staffMemberId)).resolves.toEqual(
      kept,
    );

    const replacement = await gateway.replace({
      ...daniela,
      imageAssetId: second.id,
      validUntil: civil('2027-01-15'),
      actor: actorOf(daniela.accountId),
      now: later,
    });

    await expect(gateway.findCurrent(daniela.staffMemberId)).resolves.toEqual({
      id: replacement.id,
      validUntil: civil('2027-01-15'),
    });
    await expect(
      prisma.staffPayoutQr.findMany({
        where: { staffMemberId: daniela.staffMemberId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, replacedAt: true },
      }),
    ).resolves.toEqual([
      { id: kept.id, replacedAt: later },
      { id: replacement.id, replacedAt: null },
    ]);
    await expect(
      prisma.imageAsset.findUniqueOrThrow({
        where: { id: first.id },
        select: { state: true, deleteRequestedAt: true },
      }),
    ).resolves.toEqual({ state: 'ATTACHED', deleteRequestedAt: later });
    await expect(
      prisma.auditRecord.findMany({
        where: {
          actionCode: 'staff_member.payout_qr_changed',
          targetId: daniela.accountId,
        },
        orderBy: { occurredAt: 'asc' },
        select: { actorRole: true, metadata: true },
      }),
    ).resolves.toEqual([
      {
        actorRole: 'TRAINER',
        metadata: {
          payoutQrId: kept.id,
          validUntil: '2026-12-15',
          replaced: false,
        },
      },
      {
        actorRole: 'TRAINER',
        metadata: {
          payoutQrId: replacement.id,
          validUntil: '2027-01-15',
          replaced: true,
        },
      },
    ]);
  });

  it('refuses a second current QR for the same person in the database', async () => {
    const daniela = await staffMember();
    const qr = await qrUpload(daniela.accountId);
    const other = await qrUpload(daniela.accountId);
    await gateway.replace({
      ...daniela,
      imageAssetId: qr.id,
      validUntil: civil('2026-12-15'),
      actor: actorOf(daniela.accountId),
      now,
    });

    await expect(
      prisma.staffPayoutQr.create({
        data: {
          staffMemberId: daniela.staffMemberId,
          imageAssetId: other.id,
          validUntil: civil('2026-12-20'),
          uploadedByAccountId: daniela.accountId,
        },
      }),
    ).rejects.toThrow(/staff_payout_qrs_current_key|Unique constraint/);
  });

  it('takes only her own ready payout QR upload', async () => {
    const daniela = await staffMember();
    const someoneElse = await staffMember();
    const theirs = await qrUpload(someoneElse.accountId);
    const photo = await qrUpload(daniela.accountId, 'PROFILE_PHOTO');

    for (const imageAssetId of [theirs.id, photo.id]) {
      await expect(
        gateway.replace({
          ...daniela,
          imageAssetId,
          validUntil: civil('2026-12-15'),
          actor: actorOf(daniela.accountId),
          now,
        }),
      ).rejects.toBeInstanceOf(ImageAssetNotAttachableError);
    }
    await expect(
      gateway.findCurrent(daniela.staffMemberId),
    ).resolves.toBeNull();
  });

  it('serves the image of a current QR only, and only hers when asked as her', async () => {
    const daniela = await staffMember();
    const someoneElse = await staffMember();
    const old = await qrUpload(daniela.accountId);
    const fresh = await qrUpload(daniela.accountId);
    const replaced = await gateway.replace({
      ...daniela,
      imageAssetId: old.id,
      validUntil: civil('2026-12-15'),
      actor: actorOf(daniela.accountId),
      now,
    });
    const currentQr = await gateway.replace({
      ...daniela,
      imageAssetId: fresh.id,
      validUntil: civil('2027-01-15'),
      actor: actorOf(daniela.accountId),
      now: later,
    });
    const readable = fresh.variants.find((v) => v.kind === 'READABLE')!;

    await expect(
      gateway.readImage({
        payoutQrId: currentQr.id,
        variant: 'readable',
        staffMemberId: null,
      }),
    ).resolves.toEqual({
      objectKey: readable.storageKey,
      mediaType: 'image/jpeg',
      validUntil: civil('2027-01-15'),
    });
    await expect(
      gateway.readImage({
        payoutQrId: replaced.id,
        variant: 'readable',
        staffMemberId: null,
      }),
    ).resolves.toBeNull();
    await expect(
      gateway.readImage({
        payoutQrId: currentQr.id,
        variant: 'thumbnail',
        staffMemberId: someoneElse.staffMemberId,
      }),
    ).resolves.toBeNull();
  });
});
