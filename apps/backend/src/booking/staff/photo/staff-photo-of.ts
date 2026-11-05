// FIX-041: how every read model names a staff photo: the asset it shows, or
// null while the initials stand in.
export type StaffPhotoRef = { imageAssetId: string } | null;

export const staffPhotoOf = (
  profileImageAssetId: string | null,
): StaffPhotoRef =>
  profileImageAssetId === null ? null : { imageAssetId: profileImageAssetId };
