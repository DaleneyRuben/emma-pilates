import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { listSessionAvailability } from '../../src/booking/session-availability';
import { createPrismaStaffDirectory } from '../../src/booking/staff/prisma-staff-management';
import { createPrismaStaffPhoto } from '../../src/booking/staff/photo/prisma-staff-photo';
import { ImageAssetNotAttachableError } from '../../src/uploads/image-asset-attachments';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-11-05T15:00:00.000Z');

// FIX-041: a Staff Member's photo over the same `profile_photo` variants as
// the Client's: attach first, release the previous image afterwards
// (ADR-0076), audited with the actor who changed it.
describe('staff profile photo (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let gateway: ReturnType<typeof createPrismaStaffPhoto>;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    gateway = createPrismaStaffPhoto(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const staffMember = async (
    role: 'TRAINER' | 'ADMINISTRATOR' = 'TRAINER',
    disabled = false,
  ) => {
    const member = await prisma.staffMember.create({
      data: { name: 'Daniela Ortiz', role },
    });
    const account = await prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        staffMemberId: member.id,
        activatedAt: now,
        disabledAt: disabled ? now : null,
      },
    });
    return { staffMemberId: member.id, accountId: account.id };
  };

  const photoUpload = async (ownerAccountId: string) =>
    prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose: 'PROFILE_PHOTO',
        state: 'READY',
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

  const actorOf = (accountId: string) => ({
    accountId,
    role: 'ADMINISTRATOR' as const,
    impersonationId: null,
  });

  const audits = (accountId: string) =>
    prisma.auditRecord.findMany({
      where: { targetType: 'account', targetId: accountId },
      orderBy: { occurredAt: 'asc' },
    });

  it('reads the member with her status', async () => {
    const active = await staffMember();
    const disabled = await staffMember('TRAINER', true);

    await expect(gateway.findMember(active.staffMemberId)).resolves.toEqual({
      id: active.staffMemberId,
      accountId: active.accountId,
      status: 'active',
    });
    await expect(gateway.findMember(disabled.staffMemberId)).resolves.toEqual(
      expect.objectContaining({ status: 'deactivated' }),
    );
    await expect(gateway.findMember(randomUUID())).resolves.toBeNull();
  });

  it('attaches an upload the Administrator declared to a Trainer, replaces it, and audits both', async () => {
    const trainer = await staffMember();
    const administrator = await staffMember('ADMINISTRATOR');
    const first = await photoUpload(administrator.accountId);
    const second = await photoUpload(administrator.accountId);
    const change = {
      staffMemberId: trainer.staffMemberId,
      targetAccountId: trainer.accountId,
      actor: actorOf(administrator.accountId),
      ownerAccountId: administrator.accountId,
      now,
    };

    await expect(
      gateway.replacePhoto({ ...change, imageAssetId: first.id }),
    ).resolves.toEqual({ imageAssetId: first.id });
    await gateway.replacePhoto({ ...change, imageAssetId: second.id });

    const member = await prisma.staffMember.findUniqueOrThrow({
      where: { id: trainer.staffMemberId },
    });
    expect(member.profileImageAssetId).toBe(second.id);
    const released = await prisma.imageVariant.findMany({
      where: { imageAssetId: first.id },
    });
    expect(
      released.every((variant) => variant.deleteRequestedAt !== null),
    ).toBe(true);
    const records = await audits(trainer.accountId);
    expect(records.map((record) => record.actionCode)).toEqual([
      'staff_member.photo_changed',
      'staff_member.photo_changed',
    ]);
    expect(records[1]).toMatchObject({
      actorAccountId: administrator.accountId,
      actorRole: 'ADMINISTRATOR',
      metadata: { replaced: true },
    });
  });

  it('refuses an upload declared by someone else', async () => {
    const trainer = await staffMember();
    const other = await staffMember();
    const upload = await photoUpload(other.accountId);

    await expect(
      gateway.replacePhoto({
        staffMemberId: trainer.staffMemberId,
        targetAccountId: trainer.accountId,
        actor: actorOf(trainer.accountId),
        ownerAccountId: trainer.accountId,
        imageAssetId: upload.id,
        now,
      }),
    ).rejects.toBeInstanceOf(ImageAssetNotAttachableError);
  });

  it('serves only an asset a Staff Member shows, then removes it and audits', async () => {
    const trainer = await staffMember();
    const upload = await photoUpload(trainer.accountId);
    const stranger = await photoUpload(trainer.accountId);
    const change = {
      staffMemberId: trainer.staffMemberId,
      targetAccountId: trainer.accountId,
      actor: actorOf(trainer.accountId),
      now,
    };
    await gateway.replacePhoto({
      ...change,
      ownerAccountId: trainer.accountId,
      imageAssetId: upload.id,
    });

    const thumbnail = upload.variants.find((v) => v.kind === 'THUMBNAIL');
    await expect(
      gateway.readPhotoObject({
        imageAssetId: upload.id,
        variant: 'thumbnail',
      }),
    ).resolves.toEqual({
      objectKey: thumbnail?.storageKey,
      mediaType: 'image/jpeg',
    });
    await expect(
      gateway.readPhotoObject({
        imageAssetId: stranger.id,
        variant: 'display',
      }),
    ).resolves.toBeNull();

    await gateway.removePhoto(change);
    await gateway.removePhoto(change);

    const member = await prisma.staffMember.findUniqueOrThrow({
      where: { id: trainer.staffMemberId },
    });
    expect(member.profileImageAssetId).toBeNull();
    await expect(
      gateway.readPhotoObject({ imageAssetId: upload.id, variant: 'display' }),
    ).resolves.toBeNull();
    const records = await audits(trainer.accountId);
    expect(records.map((record) => record.actionCode)).toEqual([
      'staff_member.photo_changed',
      'staff_member.photo_removed',
    ]);
  });

  it('names the photo on Perfil, Personal, and every Session a Trainer gives', async () => {
    const trainer = await staffMember();
    const upload = await photoUpload(trainer.accountId);
    await gateway.replacePhoto({
      staffMemberId: trainer.staffMemberId,
      targetAccountId: trainer.accountId,
      actor: actorOf(trainer.accountId),
      ownerAccountId: trainer.accountId,
      imageAssetId: upload.id,
      now,
    });
    const classType = await prisma.classType.create({
      data: { name: 'Mat Pilates', description: 'Mat', defaultCapacity: 8 },
    });
    const branch = await prisma.branch.create({
      data: { name: randomUUID(), address: 'Calle Uno' },
    });
    const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1_000);
    const session = await prisma.session.create({
      data: {
        branchId: branch.id,
        classTypeId: classType.id,
        trainerStaffMemberId: trainer.staffMemberId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
        capacity: 8,
      },
    });
    const photo = { imageAssetId: upload.id };
    const catalog = createCatalogRepository(prisma);

    await expect(
      catalog.findStaffProfile(trainer.staffMemberId),
    ).resolves.toMatchObject({ photo });
    await expect(
      createPrismaStaffDirectory(prisma).read(trainer.staffMemberId),
    ).resolves.toMatchObject({ photo });
    await expect(catalog.findSessionDetail(session.id)).resolves.toMatchObject({
      trainerPhoto: photo,
    });
    const availability = await listSessionAvailability(prisma)({
      branchId: branch.id,
      from: new Date(startsAt.getTime() - 1),
      until: new Date(startsAt.getTime() + 1),
      limit: 5,
    });
    expect(availability).toEqual([
      expect.objectContaining({ id: session.id, trainerPhoto: photo }),
    ]);
  });

  it('keeps the same photo without a second audit, and serves no photo of a removed member', async () => {
    const trainer = await staffMember();
    const upload = await photoUpload(trainer.accountId);
    const change = {
      staffMemberId: trainer.staffMemberId,
      targetAccountId: trainer.accountId,
      actor: actorOf(trainer.accountId),
      ownerAccountId: trainer.accountId,
      imageAssetId: upload.id,
      now,
    };
    await gateway.replacePhoto(change);
    await gateway.replacePhoto(change);
    expect(
      (await audits(trainer.accountId)).map((record) => record.actionCode),
    ).toEqual(['staff_member.photo_changed']);

    await prisma.staffMember.update({
      where: { id: trainer.staffMemberId },
      data: { deletedAt: now },
    });
    await expect(
      gateway.readPhotoObject({ imageAssetId: upload.id, variant: 'display' }),
    ).resolves.toBeNull();
  });
});
