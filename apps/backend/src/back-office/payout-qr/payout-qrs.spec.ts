import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError } from '../back-office-errors';
import { ImageAssetNotAttachableError } from '../../uploads/image-asset-attachments';
import { createPayoutQrs, type PayoutQrGateway } from './payout-qrs';

const staff = (
  role: 'trainer' | 'administrator' | 'coordinator',
  staffMemberId = 'staff-daniela',
): AuthenticatedPrincipal =>
  ({
    accountId: `account-${role}`,
    identity: { kind: 'staff', role, staffMemberId },
  }) as unknown as AuthenticatedPrincipal;

const client = {
  accountId: 'account-client',
  identity: { kind: 'client', clientId: 'client-1' },
} as unknown as AuthenticatedPrincipal;

// 2026-11-18 14:00 in La Paz.
const now = new Date('2026-11-18T18:00:00.000Z');
const civil = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const gatewayWith = (
  current: { id: string; validUntil: Date } | null,
): jest.Mocked<PayoutQrGateway> => ({
  findCurrent: jest.fn().mockResolvedValue(current),
  replace: jest
    .fn()
    .mockImplementation(({ validUntil }: { validUntil: Date }) =>
      Promise.resolve({ id: 'qr-new', validUntil }),
    ),
  readImage: jest.fn().mockResolvedValue({
    objectKey: 'key',
    mediaType: 'image/png',
    validUntil: civil('2026-12-15'),
  }),
});

const operations = (gateway: PayoutQrGateway) =>
  createPayoutQrs({ gateway, now: () => now });

describe('payout QRs', () => {
  it('lets any staff member read her own QR with its standing', async () => {
    const gateway = gatewayWith({
      id: 'qr-1',
      validUntil: civil('2026-11-20'),
    });

    await expect(
      operations(gateway).readOwn(staff('trainer')),
    ).resolves.toEqual({
      id: 'qr-1',
      validUntil: civil('2026-11-20'),
      standing: 'expiring',
    });
    expect(gateway.findCurrent).toHaveBeenCalledWith('staff-daniela');
  });

  it('reads as none when she has not uploaded one', async () => {
    await expect(
      operations(gatewayWith(null)).readOwn(staff('coordinator')),
    ).resolves.toBeNull();
  });

  it('refuses a Client', async () => {
    await expect(operations(gatewayWith(null)).readOwn(client)).rejects.toEqual(
      new BackOfficeError('back_office_access_denied'),
    );
  });

  it('replaces her QR with a new photo and its last valid day', async () => {
    const gateway = gatewayWith(null);

    await expect(
      operations(gateway).setOwn(
        { imageAssetId: 'asset-1', validUntil: '2027-01-15' },
        staff('trainer'),
      ),
    ).resolves.toEqual({
      id: 'qr-new',
      validUntil: civil('2027-01-15'),
      standing: 'valid',
    });
    expect(gateway.replace).toHaveBeenCalledWith({
      staffMemberId: 'staff-daniela',
      accountId: 'account-trainer',
      imageAssetId: 'asset-1',
      validUntil: civil('2027-01-15'),
      actor: {
        accountId: 'account-trainer',
        role: 'TRAINER',
        impersonationId: null,
      },
      now,
    });
  });

  it('says the photo is not ready when its upload cannot be attached', async () => {
    const gateway = gatewayWith(null);
    gateway.replace.mockRejectedValue(
      new ImageAssetNotAttachableError('not_ready'),
    );

    await expect(
      operations(gateway).setOwn(
        { imageAssetId: 'asset-1', validUntil: '2027-01-15' },
        staff('trainer'),
      ),
    ).rejects.toEqual(new BackOfficeError('payout_qr_not_ready'));
  });

  it('refuses a last valid day that is not after today', async () => {
    const gateway = gatewayWith(null);

    await expect(
      operations(gateway).setOwn(
        { imageAssetId: 'asset-1', validUntil: '2026-11-18' },
        staff('trainer'),
      ),
    ).rejects.toEqual(new BackOfficeError('payout_qr_valid_until_invalid'));
    expect(gateway.replace).not.toHaveBeenCalled();
  });

  it('shows the Administrator a person’s QR, but never an expired one’s image', async () => {
    const gateway = gatewayWith({
      id: 'qr-1',
      validUntil: civil('2026-11-17'),
    });

    await expect(
      operations(gateway).readForStaffMember(
        { staffMemberId: 'staff-daniela' },
        staff('administrator', 'staff-paola'),
      ),
    ).resolves.toEqual({
      id: 'qr-1',
      validUntil: civil('2026-11-17'),
      standing: 'expired',
    });
  });

  it('keeps a person’s QR from anyone but the Administrator', async () => {
    await expect(
      operations(gatewayWith(null)).readForStaffMember(
        { staffMemberId: 'staff-daniela' },
        staff('coordinator', 'staff-paula'),
      ),
    ).rejects.toEqual(new BackOfficeError('back_office_access_denied'));
  });

  it('serves the Administrator the image of a QR still valid', async () => {
    const gateway = gatewayWith(null);

    await expect(
      operations(gateway).readImageForAdministrator(
        { payoutQrId: 'qr-1', variant: 'readable' },
        staff('administrator', 'staff-paola'),
      ),
    ).resolves.toEqual({ objectKey: 'key', mediaType: 'image/png' });
    expect(gateway.readImage).toHaveBeenCalledWith({
      payoutQrId: 'qr-1',
      variant: 'readable',
      staffMemberId: null,
    });
  });

  it('refuses the Administrator the image of an expired QR', async () => {
    const gateway = gatewayWith(null);
    gateway.readImage.mockResolvedValue({
      objectKey: 'key',
      mediaType: 'image/png',
      validUntil: civil('2026-11-17'),
    });

    await expect(
      operations(gateway).readImageForAdministrator(
        { payoutQrId: 'qr-1', variant: 'readable' },
        staff('administrator', 'staff-paola'),
      ),
    ).rejects.toEqual(new BackOfficeError('payout_qr_expired'));
  });

  it('serves a staff member only her own QR, expired or not', async () => {
    const gateway = gatewayWith(null);
    gateway.readImage.mockResolvedValue(null);

    await expect(
      operations(gateway).readOwnImage(
        { payoutQrId: 'qr-other', variant: 'thumbnail' },
        staff('trainer'),
      ),
    ).rejects.toEqual(new BackOfficeError('payout_qr_not_found'));
    expect(gateway.readImage).toHaveBeenCalledWith({
      payoutQrId: 'qr-other',
      variant: 'thumbnail',
      staffMemberId: 'staff-daniela',
    });
  });
});
