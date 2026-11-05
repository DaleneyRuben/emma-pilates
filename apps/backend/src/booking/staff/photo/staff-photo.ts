import type { AuditActor } from '../../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';

// FIX-041 (decision §20.23): a Staff Member's profile photo, set by herself
// from Perfil or by the Administrator or the Coordinator for anyone on the
// team, over the same `profile_photo` uploads as the Client's (ADR-0073).
// A replaced or removed photo releases its variants at once (ADR-0076).
export type StaffPhotoVariant = 'display' | 'thumbnail';
export const staffPhotoVariants: readonly StaffPhotoVariant[] = [
  'display',
  'thumbnail',
];

export type StaffPhotoErrorCode =
  | 'profile_photo_not_ready'
  | 'profile_photo_not_found'
  | 'staff_access_denied'
  | 'staff_member_not_found'
  | 'staff_member_deactivated';

export class StaffPhotoError extends Error {
  readonly status = 500;

  constructor(readonly code: StaffPhotoErrorCode) {
    super(code);
    this.name = 'StaffPhotoError';
  }
}

export type StaffPhotoMember = {
  id: string;
  accountId: string;
  status: 'pending' | 'active' | 'deactivated';
};

export type StaffPhotoChange = {
  staffMemberId: string;
  targetAccountId: string;
  actor: AuditActor;
  now: Date;
};

export type StaffPhotoGateway = {
  findMember: (staffMemberId: string) => Promise<StaffPhotoMember | null>;
  replacePhoto: (
    input: StaffPhotoChange & { ownerAccountId: string; imageAssetId: string },
  ) => Promise<{ imageAssetId: string }>;
  removePhoto: (input: StaffPhotoChange) => Promise<void>;
  readPhotoObject: (input: {
    imageAssetId: string;
    variant: StaffPhotoVariant;
  }) => Promise<{ objectKey: string; mediaType: string } | null>;
};

export type StaffPhotoResult = {
  staffMemberId: string;
  photo: { imageAssetId: string } | null;
};

type Dependencies = { gateway: StaffPhotoGateway; now: () => Date };

const notImplemented = (): Promise<never> =>
  Promise.reject(new Error('not implemented'));

export const setOwnStaffPhoto: (
  command: { imageAssetId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<StaffPhotoResult> = notImplemented;

export const removeOwnStaffPhoto: (
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<StaffPhotoResult> = notImplemented;

export const setStaffMemberPhoto: (
  command: { staffMemberId: string; imageAssetId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<StaffPhotoResult> = notImplemented;

export const removeStaffMemberPhoto: (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<StaffPhotoResult> = notImplemented;

export const readStaffPhoto: (
  query: { imageAssetId: string; variant: StaffPhotoVariant },
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: StaffPhotoGateway },
) => Promise<{ objectKey: string; mediaType: string }> = notImplemented;
