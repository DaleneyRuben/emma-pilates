import { ImageAssetNotAttachableError } from '../../uploads/image-asset-attachments';
import { BookingAccessDeniedError } from '../commands/create-booking';
import {
  ClientPhotoError,
  readClientPhoto,
  removeClientPhoto,
  setClientPhoto,
  type ClientPhotoGateway,
} from './client-photo';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const staff = {
  ...principal,
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'staff-id',
    role: 'trainer' as const,
    branchIds: [],
  },
};
const profile = {
  id: 'client-id',
  name: 'Lucía Fernández',
  email: 'lucia@example.com',
  phone: null,
  referralCode: 'REF-LUCIA',
  photo: { imageAssetId: 'asset-2' },
};
const now = new Date('2026-09-24T15:00:00.000Z');

const gateway = (): jest.Mocked<ClientPhotoGateway> => ({
  replacePhoto: jest.fn().mockResolvedValue(profile),
  removePhoto: jest.fn().mockResolvedValue(undefined),
  readPhotoObject: jest.fn().mockResolvedValue(null),
});

describe('setClientPhoto', () => {
  it('attaches the actor-owned upload to the signed-in Client', async () => {
    const photos = gateway();

    await expect(
      setClientPhoto({ imageAssetId: 'asset-2' }, principal, {
        gateway: photos,
        now: () => now,
      }),
    ).resolves.toEqual(profile);
    expect(photos.replacePhoto).toHaveBeenCalledWith({
      clientId: 'client-id',
      ownerAccountId: 'account-id',
      imageAssetId: 'asset-2',
      now,
    });
  });

  it('reports an upload that is not a READY profile photo of the actor', async () => {
    const photos = gateway();
    photos.replacePhoto.mockRejectedValue(
      new ImageAssetNotAttachableError('not_owned'),
    );

    await expect(
      setClientPhoto({ imageAssetId: 'asset-9' }, principal, {
        gateway: photos,
        now: () => now,
      }),
    ).rejects.toMatchObject({ code: 'profile_photo_not_ready', status: 409 });
  });

  it('denies Staff principals', async () => {
    const photos = gateway();

    await expect(
      setClientPhoto({ imageAssetId: 'asset-2' }, staff, {
        gateway: photos,
        now: () => now,
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    expect(photos.replacePhoto).not.toHaveBeenCalled();
  });
});

describe('removeClientPhoto', () => {
  it('releases the Client photo', async () => {
    const photos = gateway();

    await removeClientPhoto(principal, { gateway: photos, now: () => now });

    expect(photos.removePhoto).toHaveBeenCalledWith({
      clientId: 'client-id',
      now,
    });
  });

  it('denies Staff principals', async () => {
    await expect(
      removeClientPhoto(staff, { gateway: gateway(), now: () => now }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});

describe('readClientPhoto', () => {
  it('reads the requested private variant of the Client photo', async () => {
    const photos = gateway();
    photos.readPhotoObject.mockResolvedValue({
      objectKey: 'private/profile_photo/asset-2/display',
      mediaType: 'image/jpeg',
    });

    await expect(
      readClientPhoto({ variant: 'display' }, principal, { gateway: photos }),
    ).resolves.toEqual({
      objectKey: 'private/profile_photo/asset-2/display',
      mediaType: 'image/jpeg',
    });
    expect(photos.readPhotoObject).toHaveBeenCalledWith({
      clientId: 'client-id',
      variant: 'display',
    });
  });

  it('reports a Client without a photo', async () => {
    await expect(
      readClientPhoto({ variant: 'thumbnail' }, principal, {
        gateway: gateway(),
      }),
    ).rejects.toMatchObject({ code: 'profile_photo_not_found', status: 404 });
  });

  it('denies Staff principals', async () => {
    await expect(
      readClientPhoto({ variant: 'display' }, staff, { gateway: gateway() }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });

  it('exposes the stable codes as ClientPhotoError', () => {
    expect(new ClientPhotoError('profile_photo_not_found').status).toBe(404);
  });
});
