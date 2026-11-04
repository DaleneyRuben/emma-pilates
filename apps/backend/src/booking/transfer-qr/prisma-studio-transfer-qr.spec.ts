import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { ObjectStorage } from '../../uploads/object-storage';
import { AdministrationError } from '../administration/administration-errors';
import { createStudioTransferQr } from './prisma-studio-transfer-qr';
import { TransferQrError, transferQrStorageKey } from './transfer-qr-image';

const staff = (
  role: 'administrator' | 'coordinator' | 'assistant',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-staff`,
    role,
    branchIds: [],
  },
});

const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'session-id',
  identity: { kind: 'client', clientId: 'client-id' },
};

const now = new Date('2026-11-04T14:00:00.000Z');

const setup = (latest: { occurredAt: Date } | null = null) => {
  const auditRecord = {
    findFirst: jest.fn().mockResolvedValue(latest),
    create: jest.fn().mockResolvedValue({}),
  };
  const replace = jest.fn().mockResolvedValue(undefined);
  const storage: ObjectStorage = {
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    replace,
  };
  const operations = createStudioTransferQr(
    { auditRecord } as unknown as PrismaClient,
    storage,
    { now: () => now },
  );
  return { auditRecord, storage: { replace }, operations };
};

const qrBytes = () =>
  sharp({
    create: {
      width: 30,
      height: 20,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();

describe('studio transfer QR', () => {
  it('reports when the QR was last replaced', async () => {
    const occurredAt = new Date('2026-10-15T12:00:00.000Z');
    const { auditRecord, operations } = setup({ occurredAt });

    await expect(operations.read(staff('administrator'))).resolves.toEqual({
      updatedAt: occurredAt,
    });
    expect(auditRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { actionCode: 'studio_transfer_qr.replaced' },
        orderBy: { occurredAt: 'desc' },
      }),
    );
  });

  it('reports no date while the server file is still in use', async () => {
    const { operations } = setup(null);

    await expect(operations.read(staff('administrator'))).resolves.toEqual({
      updatedAt: null,
    });
  });

  it('stores the QR as PNG and audits the replacement', async () => {
    const { auditRecord, storage, operations } = setup();

    await expect(
      operations.replace(staff('administrator'), await qrBytes()),
    ).resolves.toEqual({ updatedAt: now });

    const [key, stored] = storage.replace.mock.calls[0] as [string, Buffer];
    expect(key).toBe(transferQrStorageKey);
    expect((await sharp(stored).metadata()).format).toBe('png');
    expect(auditRecord.create).toHaveBeenCalledTimes(1);
    expect(auditRecord.create.mock.calls[0]).toMatchObject([
      {
        data: {
          actionCode: 'studio_transfer_qr.replaced',
          outcome: 'SUCCEEDED',
          actorKind: 'ACCOUNT',
          actorAccountId: 'administrator-account',
          actorRole: 'ADMINISTRATOR',
          targetType: 'studio_transfer_qr',
          targetId: null,
          branchId: null,
          occurredAt: now,
          metadata: {
            byteSize: stored.byteLength,
            width: 30,
            height: 20,
            sha256: createHash('sha256').update(stored).digest('hex'),
          },
        },
      },
    ]);
  });

  it('stores and audits nothing for an image it refuses', async () => {
    const { auditRecord, storage, operations } = setup();

    await expect(
      operations.replace(staff('administrator'), Buffer.from('nope')),
    ).rejects.toBeInstanceOf(TransferQrError);
    expect(storage.replace).not.toHaveBeenCalled();
    expect(auditRecord.create).not.toHaveBeenCalled();
  });

  it.each([
    ['the Coordinator', staff('coordinator')],
    ['the Assistant', staff('assistant')],
    ['a Client', client],
  ])('refuses %s', async (_name, principal) => {
    const { storage, operations } = setup();

    await expect(operations.read(principal)).rejects.toBeInstanceOf(
      AdministrationError,
    );
    await expect(
      operations.replace(principal, await qrBytes()),
    ).rejects.toMatchObject({ code: 'administration_access_denied' });
    expect(storage.replace).not.toHaveBeenCalled();
  });
});
