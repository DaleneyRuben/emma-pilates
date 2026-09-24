import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { createPrismaClientPhoto } from '../../src/booking/client/prisma-client-photo';
import { ImageAssetNotAttachableError } from '../../src/uploads/image-asset-attachments';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-09-24T15:00:00.000Z');

// Client 22's photo over UPL-002's `profile_photo` variants: attach first,
// release the previous image afterwards (ADR-0076), audited (MOB-020).
describe('client profile photo (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let gateway: ReturnType<typeof createPrismaClientPhoto>;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    gateway = createPrismaClientPhoto(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const client = async () => {
    const created = await prisma.client.create({
      data: { name: 'Lucía Fernández', referralCode: randomUUID().slice(0, 8) },
    });
    const account = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: created.id },
    });
    return { clientId: created.id, accountId: account.id };
  };

  const photoUpload = async (
    ownerAccountId: string,
    state: 'READY' | 'PENDING' = 'READY',
    purpose: 'PROFILE_PHOTO' | 'PROMOTION' = 'PROFILE_PHOTO',
  ) =>
    prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose,
        state,
        pendingObjectKey: `pending/profile_photo/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 10,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: new Date(now.getTime() - 60_000),
        expiresAt: new Date(now.getTime() + 60_000),
        finalizedAt: new Date(now.getTime() - 30_000),
        deletionDueAt: now,
        variants: {
          create: [
            { kind: 'DISPLAY', width: 320, height: 320 },
            { kind: 'THUMBNAIL', width: 96, height: 96 },
          ].map((variant) => ({
            kind: variant.kind as 'DISPLAY',
            visibility: 'PRIVATE',
            storageKey: `private/profile_photo/${randomUUID()}/${variant.kind.toLowerCase()}`,
            mediaType: 'JPEG',
            byteSize: 3,
            width: variant.width,
            height: variant.height,
          })),
        },
      },
      include: { variants: true },
    });

  const audits = (clientId: string) =>
    prisma.auditRecord.findMany({
      where: { targetType: 'client', targetId: clientId },
      orderBy: { occurredAt: 'asc' },
    });

  it('attaches a ready profile photo of the actor and audits the change', async () => {
    const { clientId, accountId } = await client();
    const upload = await photoUpload(accountId);

    const profile = await gateway.replacePhoto({
      clientId,
      ownerAccountId: accountId,
      imageAssetId: upload.id,
      now,
    });

    expect(profile.photo).toEqual({ imageAssetId: upload.id });
    const asset = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: upload.id },
    });
    expect(asset.state).toBe('ATTACHED');
    expect(asset.deletionDueAt).toBeNull();
    expect(await audits(clientId)).toMatchObject([
      {
        actionCode: 'client.photo_changed',
        actorKind: 'ACCOUNT',
        actorAccountId: accountId,
        metadata: { replaced: false },
      },
    ]);
  });

  it('activates the replacement before releasing the previous photo and its variants', async () => {
    const { clientId, accountId } = await client();
    const first = await photoUpload(accountId);
    const second = await photoUpload(accountId);
    await gateway.replacePhoto({
      clientId,
      ownerAccountId: accountId,
      imageAssetId: first.id,
      now,
    });

    const later = new Date(now.getTime() + 60_000);
    const profile = await gateway.replacePhoto({
      clientId,
      ownerAccountId: accountId,
      imageAssetId: second.id,
      now: later,
    });

    expect(profile.photo).toEqual({ imageAssetId: second.id });
    const released = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: first.id },
      include: { variants: true },
    });
    expect(released.deleteRequestedAt).toEqual(later);
    expect(released.variants.map((variant) => variant.deleteRequestedAt)).toEqual(
      [later, later],
    );
    expect(
      (await prisma.imageAsset.findUniqueOrThrow({ where: { id: second.id } }))
        .deleteRequestedAt,
    ).toBeNull();
    expect((await audits(clientId)).map((audit) => audit.metadata)).toEqual([
      { replaced: false },
      { replaced: true },
    ]);
  });

  it('keeps the same photo without a second audit when the attached asset is sent again', async () => {
    const { clientId, accountId } = await client();
    const upload = await photoUpload(accountId);
    await gateway.replacePhoto({
      clientId,
      ownerAccountId: accountId,
      imageAssetId: upload.id,
      now,
    });

    const profile = await gateway.replacePhoto({
      clientId,
      ownerAccountId: accountId,
      imageAssetId: upload.id,
      now: new Date(now.getTime() + 1_000),
    });

    expect(profile.photo).toEqual({ imageAssetId: upload.id });
    expect(await audits(clientId)).toHaveLength(1);
  });

  it('refuses an upload that is pending, another purpose, or someone else’s and changes nothing', async () => {
    const { clientId, accountId } = await client();
    const other = await client();
    const attach = (imageAssetId: string) =>
      gateway.replacePhoto({
        clientId,
        ownerAccountId: accountId,
        imageAssetId,
        now,
      });

    await expect(
      attach((await photoUpload(accountId, 'PENDING')).id),
    ).rejects.toThrow(ImageAssetNotAttachableError);
    await expect(
      attach((await photoUpload(accountId, 'READY', 'PROMOTION')).id),
    ).rejects.toThrow(ImageAssetNotAttachableError);
    await expect(
      attach((await photoUpload(other.accountId)).id),
    ).rejects.toThrow(ImageAssetNotAttachableError);
    expect(
      (await prisma.client.findUniqueOrThrow({ where: { id: clientId } }))
        .profileImageAssetId,
    ).toBeNull();
    expect(await audits(clientId)).toEqual([]);
  });

  it('removes the photo, releases its variants, and audits; removing nothing writes nothing', async () => {
    const { clientId, accountId } = await client();
    const upload = await photoUpload(accountId);
    await gateway.replacePhoto({
      clientId,
      ownerAccountId: accountId,
      imageAssetId: upload.id,
      now,
    });

    const later = new Date(now.getTime() + 60_000);
    await gateway.removePhoto({ clientId, now: later });
    await gateway.removePhoto({ clientId, now: later });

    expect(
      (await prisma.client.findUniqueOrThrow({ where: { id: clientId } }))
        .profileImageAssetId,
    ).toBeNull();
    const released = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: upload.id },
      include: { variants: true },
    });
    expect(released.deleteRequestedAt).toEqual(later);
    expect(released.variants.every((v) => v.deleteRequestedAt !== null)).toBe(
      true,
    );
    expect((await audits(clientId)).map((audit) => audit.actionCode)).toEqual([
      'client.photo_changed',
      'client.photo_removed',
    ]);
  });

  it('reads the display or thumbnail object of the attached photo, or nothing', async () => {
    const { clientId, accountId } = await client();
    expect(
      await gateway.readPhotoObject({ clientId, variant: 'display' }),
    ).toBeNull();
    const upload = await photoUpload(accountId);
    await gateway.replacePhoto({
      clientId,
      ownerAccountId: accountId,
      imageAssetId: upload.id,
      now,
    });

    const display = upload.variants.find((v) => v.kind === 'DISPLAY')!;
    const thumbnail = upload.variants.find((v) => v.kind === 'THUMBNAIL')!;
    expect(
      await gateway.readPhotoObject({ clientId, variant: 'display' }),
    ).toEqual({ objectKey: display.storageKey, mediaType: 'image/jpeg' });
    expect(
      await gateway.readPhotoObject({ clientId, variant: 'thumbnail' }),
    ).toEqual({ objectKey: thumbnail.storageKey, mediaType: 'image/jpeg' });
  });
});
