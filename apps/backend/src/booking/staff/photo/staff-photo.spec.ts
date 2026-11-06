import { ImageAssetNotAttachableError } from '../../../uploads/image-asset-attachments';
import {
  readStaffPhoto,
  removeOwnStaffPhoto,
  removeStaffMemberPhoto,
  setOwnStaffPhoto,
  setStaffMemberPhoto,
  type StaffPhotoGateway,
} from './staff-photo';

const staffOf = (
  role: 'trainer' | 'assistant' | 'administrator' | 'coordinator',
) => ({
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
const trainer = staffOf('trainer');
const administrator = staffOf('administrator');
const coordinator = staffOf('coordinator');
const assistant = staffOf('assistant');
const now = new Date('2026-11-05T15:00:00.000Z');
const daniela = {
  id: 'daniela-staff',
  accountId: 'daniela-account',
  status: 'active' as const,
};

const gateway = (): jest.Mocked<StaffPhotoGateway> => ({
  findMember: jest.fn().mockResolvedValue(daniela),
  replacePhoto: jest.fn().mockResolvedValue({ imageAssetId: 'asset-2' }),
  removePhoto: jest.fn().mockResolvedValue(undefined),
  readPhotoObject: jest.fn().mockResolvedValue(null),
});
const deps = (photos: StaffPhotoGateway) => ({
  gateway: photos,
  now: () => now,
});

describe('setOwnStaffPhoto', () => {
  it('attaches the upload to the signed-in Staff Member of any Role', async () => {
    const photos = gateway();
    photos.findMember.mockResolvedValue({
      id: 'trainer-staff',
      accountId: 'trainer-account',
      status: 'active',
    });

    await expect(
      setOwnStaffPhoto({ imageAssetId: 'asset-2' }, trainer, deps(photos)),
    ).resolves.toEqual({
      staffMemberId: 'trainer-staff',
      photo: { imageAssetId: 'asset-2' },
    });
    expect(photos.replacePhoto).toHaveBeenCalledWith({
      staffMemberId: 'trainer-staff',
      targetAccountId: 'trainer-account',
      actor: {
        accountId: 'trainer-account',
        role: 'TRAINER',
        impersonationId: null,
      },
      ownerAccountId: 'trainer-account',
      imageAssetId: 'asset-2',
      now,
    });
  });

  it('refuses a Client', async () => {
    const photos = gateway();

    await expect(
      setOwnStaffPhoto({ imageAssetId: 'asset-2' }, client, deps(photos)),
    ).rejects.toMatchObject({ code: 'staff_access_denied', status: 403 });
    expect(photos.replacePhoto).not.toHaveBeenCalled();
  });

  it('reports an upload that is not a READY profile photo of the uploader', async () => {
    const photos = gateway();
    photos.replacePhoto.mockRejectedValue(
      new ImageAssetNotAttachableError('wrong_purpose'),
    );

    await expect(
      setOwnStaffPhoto({ imageAssetId: 'asset-9' }, trainer, deps(photos)),
    ).rejects.toMatchObject({ code: 'profile_photo_not_ready', status: 409 });
  });
});

describe('removeOwnStaffPhoto', () => {
  it('removes the signed-in Staff Member photo', async () => {
    const photos = gateway();
    photos.findMember.mockResolvedValue({
      id: 'assistant-staff',
      accountId: 'assistant-account',
      status: 'active',
    });

    await expect(removeOwnStaffPhoto(assistant, deps(photos))).resolves.toEqual(
      { staffMemberId: 'assistant-staff', photo: null },
    );
    expect(photos.removePhoto).toHaveBeenCalledWith({
      staffMemberId: 'assistant-staff',
      targetAccountId: 'assistant-account',
      actor: {
        accountId: 'assistant-account',
        role: 'ASSISTANT',
        impersonationId: null,
      },
      now,
    });
  });
});

describe('setStaffMemberPhoto', () => {
  it.each([
    ['Administrator', administrator],
    ['Coordinator', coordinator],
  ])(
    'lets the %s attach a photo she uploaded to anyone on the team',
    async (_, actor) => {
      const photos = gateway();

      await expect(
        setStaffMemberPhoto(
          { staffMemberId: 'daniela-staff', imageAssetId: 'asset-2' },
          actor,
          deps(photos),
        ),
      ).resolves.toEqual({
        staffMemberId: 'daniela-staff',
        photo: { imageAssetId: 'asset-2' },
      });
      expect(photos.replacePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          staffMemberId: 'daniela-staff',
          targetAccountId: 'daniela-account',
          ownerAccountId: actor.accountId,
        }),
      );
    },
  );

  it.each([
    ['a Trainer', trainer],
    ['an Assistant', assistant],
    ['a Client', client],
  ])('refuses %s', async (_, actor) => {
    const photos = gateway();

    await expect(
      setStaffMemberPhoto(
        { staffMemberId: 'daniela-staff', imageAssetId: 'asset-2' },
        actor,
        deps(photos),
      ),
    ).rejects.toMatchObject({ code: 'staff_access_denied', status: 403 });
  });

  it('answers 404 for an unknown Staff Member', async () => {
    const photos = gateway();
    photos.findMember.mockResolvedValue(null);

    await expect(
      setStaffMemberPhoto(
        { staffMemberId: 'missing', imageAssetId: 'asset-2' },
        administrator,
        deps(photos),
      ),
    ).rejects.toMatchObject({ code: 'staff_member_not_found', status: 404 });
  });

  it('refuses a deactivated Staff Member', async () => {
    const photos = gateway();
    photos.findMember.mockResolvedValue({ ...daniela, status: 'deactivated' });

    await expect(
      setStaffMemberPhoto(
        { staffMemberId: 'daniela-staff', imageAssetId: 'asset-2' },
        administrator,
        deps(photos),
      ),
    ).rejects.toMatchObject({ code: 'staff_member_deactivated', status: 409 });
    expect(photos.replacePhoto).not.toHaveBeenCalled();
  });
});

describe('removeStaffMemberPhoto', () => {
  it('lets the Coordinator remove a team member photo', async () => {
    const photos = gateway();

    await expect(
      removeStaffMemberPhoto(
        { staffMemberId: 'daniela-staff' },
        coordinator,
        deps(photos),
      ),
    ).resolves.toEqual({ staffMemberId: 'daniela-staff', photo: null });
    expect(photos.removePhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        staffMemberId: 'daniela-staff',
        targetAccountId: 'daniela-account',
      }),
    );
  });
});

describe('readStaffPhoto', () => {
  it('serves a current staff photo to any signed-in Account, Clients included', async () => {
    const photos = gateway();
    photos.readPhotoObject.mockResolvedValue({
      objectKey: 'private/profile_photo/asset-2/thumbnail',
      mediaType: 'image/jpeg',
    });

    await expect(
      readStaffPhoto(
        { imageAssetId: 'asset-2', variant: 'thumbnail' },
        client,
        { gateway: photos },
      ),
    ).resolves.toEqual({
      objectKey: 'private/profile_photo/asset-2/thumbnail',
      mediaType: 'image/jpeg',
    });
    expect(photos.readPhotoObject).toHaveBeenCalledWith({
      imageAssetId: 'asset-2',
      variant: 'thumbnail',
    });
  });

  it('answers 404 for an asset no Staff Member shows', async () => {
    await expect(
      readStaffPhoto({ imageAssetId: 'asset-x', variant: 'display' }, trainer, {
        gateway: gateway(),
      }),
    ).rejects.toMatchObject({ code: 'profile_photo_not_found', status: 404 });
  });
});
