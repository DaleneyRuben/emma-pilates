import { BookingAccessDeniedError } from '../commands/create-booking';
import {
  readClientPhotoForStaff,
  type ClientPhotoAssetReader,
} from './client-photo-for-staff';

const staffOf = (role: 'trainer' | 'assistant' | 'coordinator') => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: `${role}-staff`,
    role,
    branchIds: [],
  },
});
const client = {
  accountId: 'client-account',
  authenticationSessionId: 'session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};

const reader = (): jest.Mocked<ClientPhotoAssetReader> => ({
  readPhotoObjectByAsset: jest.fn().mockResolvedValue({
    objectKey: 'private/profile_photo/asset-2/thumbnail',
    mediaType: 'image/jpeg',
  }),
});

// Finding n.º 30 (owner, 2026-11-05): wherever the staff see a Client, they
// see her photo; another Client never reads it.
describe('readClientPhotoForStaff', () => {
  it.each([
    ['a Trainer', staffOf('trainer')],
    ['an Assistant', staffOf('assistant')],
    ['the Coordinator', staffOf('coordinator')],
  ])('serves a current Client photo by asset to %s', async (_, principal) => {
    const photos = reader();

    await expect(
      readClientPhotoForStaff(
        { imageAssetId: 'asset-2', variant: 'thumbnail' },
        principal,
        { reader: photos },
      ),
    ).resolves.toEqual({
      objectKey: 'private/profile_photo/asset-2/thumbnail',
      mediaType: 'image/jpeg',
    });
    expect(photos.readPhotoObjectByAsset).toHaveBeenCalledWith({
      imageAssetId: 'asset-2',
      variant: 'thumbnail',
    });
  });

  it('refuses a Client, even for her own asset', async () => {
    const photos = reader();

    await expect(
      readClientPhotoForStaff(
        { imageAssetId: 'asset-2', variant: 'display' },
        client,
        { reader: photos },
      ),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    expect(photos.readPhotoObjectByAsset).not.toHaveBeenCalled();
  });

  it('answers 404 for an asset no Client shows', async () => {
    const photos = reader();
    photos.readPhotoObjectByAsset.mockResolvedValue(null);

    await expect(
      readClientPhotoForStaff(
        { imageAssetId: 'asset-x', variant: 'display' },
        staffOf('trainer'),
        { reader: photos },
      ),
    ).rejects.toMatchObject({ code: 'profile_photo_not_found', status: 404 });
  });
});
