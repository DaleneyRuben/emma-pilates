import type { Response } from 'express';
import type { BackOfficeOperations } from '../back-office-http';
import { BackOfficeError } from '../back-office-errors';
import {
  AdministratorPayoutQrController,
  OwnPayoutQrController,
} from './payout-qr.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const qrId = '0b0f7a52-7d7c-4bbf-9d49-5d7bd4a1b2c3';
const staffId = '5c7a1c55-2d6e-4b1f-8f0e-3c2a9d8e7f61';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'me',
    role: 'trainer' as const,
  },
};
const civil = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const responseSink = () => {
  const headers: Record<string, string> = {};
  return {
    headers,
    response: {
      setHeader: (name: string, value: string) => (headers[name] = value),
    } as unknown as Response,
  };
};

describe('payout QR controllers (FIX-072)', () => {
  const resolvePrincipal = jest.fn();
  const payoutQrs = {
    readOwn: jest.fn(),
    setOwn: jest.fn(),
    readOwnImage: jest.fn(),
    readForStaffMember: jest.fn(),
    readImageForAdministrator: jest.fn(),
  };
  const get = jest.fn();
  const operations = { payoutQrs } as unknown as BackOfficeOperations;
  const own = new OwnPayoutQrController(operations, resolvePrincipal, { get });
  const admin = new AdministratorPayoutQrController(
    operations,
    resolvePrincipal,
    { get },
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('returns her QR with its civil last day and her own image route', async () => {
    payoutQrs.readOwn.mockResolvedValue({
      id: qrId,
      validUntil: civil('2026-12-15'),
      standing: 'expired',
    });

    await expect(own.read(bearer)).resolves.toEqual({
      payoutQr: {
        id: qrId,
        validUntil: '2026-12-15',
        standing: 'expired',
        imageUrl: `/api/v1/staff-members/current/payout-qr/${qrId}/image`,
      },
    });
  });

  it('says she has none', async () => {
    payoutQrs.readOwn.mockResolvedValue(null);

    await expect(own.read(bearer)).resolves.toEqual({ payoutQr: null });
  });

  it('saves a new QR and refuses a malformed body before authenticating', async () => {
    payoutQrs.setOwn.mockResolvedValue({
      id: qrId,
      validUntil: civil('2027-01-15'),
      standing: 'valid',
    });
    const body = { imageAssetId: staffId, validUntil: '2027-01-15' };

    await expect(own.set(bearer, body)).resolves.toMatchObject({
      payoutQr: { id: qrId, validUntil: '2027-01-15' },
    });
    expect(payoutQrs.setOwn).toHaveBeenCalledWith(body, principal);
    await expect(
      own.set(bearer, { imageAssetId: 'x', validUntil: '15/01/2027' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuses replacing her QR while the Administrator sees the app as her', async () => {
    resolvePrincipal.mockResolvedValue({
      ...principal,
      impersonation: { id: 'imp-1', administratorAccountId: 'admin-1' },
    });

    await expect(
      own.set(bearer, { imageAssetId: staffId, validUntil: '2027-01-15' }),
    ).rejects.toMatchObject({
      response: { code: 'impersonation_forbidden' },
      status: 403,
    });
    expect(payoutQrs.setOwn).not.toHaveBeenCalled();
  });

  it('maps a refused last day to its problem', async () => {
    payoutQrs.setOwn.mockRejectedValue(
      new BackOfficeError('payout_qr_valid_until_invalid'),
    );

    await expect(
      own.set(bearer, { imageAssetId: staffId, validUntil: '2026-11-18' }),
    ).rejects.toMatchObject({
      response: { code: 'payout_qr_valid_until_invalid' },
      status: 400,
    });
  });

  it('shows the Administrator no image route for an expired QR', async () => {
    payoutQrs.readForStaffMember.mockResolvedValue({
      id: qrId,
      validUntil: civil('2026-11-17'),
      standing: 'expired',
    });

    await expect(admin.read(staffId, bearer)).resolves.toEqual({
      payoutQr: {
        id: qrId,
        validUntil: '2026-11-17',
        standing: 'expired',
        imageUrl: null,
      },
    });
    expect(payoutQrs.readForStaffMember).toHaveBeenCalledWith(
      { staffMemberId: staffId },
      principal,
    );
  });

  it('gives the Administrator the image route of a valid QR', async () => {
    payoutQrs.readForStaffMember.mockResolvedValue({
      id: qrId,
      validUntil: civil('2026-12-15'),
      standing: 'expiring',
    });

    await expect(admin.read(staffId, bearer)).resolves.toMatchObject({
      payoutQr: { imageUrl: `/api/v1/administrator/payout-qrs/${qrId}/image` },
    });
  });

  it('streams a QR image uncached, readable by default', async () => {
    payoutQrs.readImageForAdministrator.mockResolvedValue({
      objectKey: 'private/qr',
      mediaType: 'image/jpeg',
    });
    get.mockResolvedValue(Buffer.from('qr'));
    const { headers, response } = responseSink();

    await admin.image(qrId, undefined, bearer, response);

    expect(payoutQrs.readImageForAdministrator).toHaveBeenCalledWith(
      { payoutQrId: qrId, variant: 'readable' },
      principal,
    );
    expect(headers).toEqual({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
  });

  it('refuses an expired QR image with its problem', async () => {
    payoutQrs.readImageForAdministrator.mockRejectedValue(
      new BackOfficeError('payout_qr_expired'),
    );

    await expect(
      admin.image(qrId, 'thumbnail', bearer, responseSink().response),
    ).rejects.toMatchObject({
      response: { code: 'payout_qr_expired' },
      status: 409,
    });
  });

  it('streams her own image through her own read', async () => {
    payoutQrs.readOwnImage.mockResolvedValue({
      objectKey: 'k',
      mediaType: 'image/png',
    });
    get.mockResolvedValue(Buffer.from('qr'));

    await own.image(qrId, 'thumbnail', bearer, responseSink().response);

    expect(payoutQrs.readOwnImage).toHaveBeenCalledWith(
      { payoutQrId: qrId, variant: 'thumbnail' },
      principal,
    );
  });
});
