import { ImageAssetNotAttachableError } from '../../../uploads/image-asset-attachments';
import {
  auditActorOf,
  type AuditActor,
} from '../../../system-identity/authentication/audit-actor';
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

const statuses: Record<StaffPhotoErrorCode, number> = {
  profile_photo_not_ready: 409,
  profile_photo_not_found: 404,
  staff_access_denied: 403,
  staff_member_not_found: 404,
  staff_member_deactivated: 409,
};

export class StaffPhotoError extends Error {
  readonly status: number;

  constructor(readonly code: StaffPhotoErrorCode) {
    super(code);
    this.name = 'StaffPhotoError';
    this.status = statuses[code];
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

const ownStaffMemberId = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'staff') {
    throw new StaffPhotoError('staff_access_denied');
  }
  return principal.identity.staffMemberId;
};

// The owner's decision: the Administrator and the Coordinator change anyone's
// photo on the team, not only a Trainer's.
const requirePhotoManager = (principal: AuthenticatedPrincipal): void => {
  if (
    principal.identity.kind !== 'staff' ||
    (principal.identity.role !== 'administrator' &&
      principal.identity.role !== 'coordinator')
  ) {
    throw new StaffPhotoError('staff_access_denied');
  }
};

const requireMember = async (
  gateway: StaffPhotoGateway,
  staffMemberId: string,
): Promise<StaffPhotoMember> => {
  const member = await gateway.findMember(staffMemberId);
  if (member === null) throw new StaffPhotoError('staff_member_not_found');
  if (member.status === 'deactivated') {
    throw new StaffPhotoError('staff_member_deactivated');
  }
  return member;
};

const replace = async (
  member: StaffPhotoMember,
  imageAssetId: string,
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
): Promise<StaffPhotoResult> => {
  try {
    const photo = await dependencies.gateway.replacePhoto({
      staffMemberId: member.id,
      targetAccountId: member.accountId,
      actor: auditActorOf(principal),
      // The upload belongs to whoever declared it: herself or the manager.
      ownerAccountId: principal.accountId,
      imageAssetId,
      now: dependencies.now(),
    });
    return { staffMemberId: member.id, photo };
  } catch (error) {
    if (error instanceof ImageAssetNotAttachableError) {
      throw new StaffPhotoError('profile_photo_not_ready');
    }
    throw error;
  }
};

const remove = async (
  member: StaffPhotoMember,
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
): Promise<StaffPhotoResult> => {
  await dependencies.gateway.removePhoto({
    staffMemberId: member.id,
    targetAccountId: member.accountId,
    actor: auditActorOf(principal),
    now: dependencies.now(),
  });
  return { staffMemberId: member.id, photo: null };
};

export const setOwnStaffPhoto = async (
  command: { imageAssetId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
): Promise<StaffPhotoResult> => {
  const staffMemberId = ownStaffMemberId(principal);
  const member = await requireMember(dependencies.gateway, staffMemberId);
  return replace(member, command.imageAssetId, principal, dependencies);
};

export const removeOwnStaffPhoto = async (
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
): Promise<StaffPhotoResult> => {
  const staffMemberId = ownStaffMemberId(principal);
  const member = await requireMember(dependencies.gateway, staffMemberId);
  return remove(member, principal, dependencies);
};

export const setStaffMemberPhoto = async (
  command: { staffMemberId: string; imageAssetId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
): Promise<StaffPhotoResult> => {
  requirePhotoManager(principal);
  const member = await requireMember(
    dependencies.gateway,
    command.staffMemberId,
  );
  return replace(member, command.imageAssetId, principal, dependencies);
};

export const removeStaffMemberPhoto = async (
  command: { staffMemberId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
): Promise<StaffPhotoResult> => {
  requirePhotoManager(principal);
  const member = await requireMember(
    dependencies.gateway,
    command.staffMemberId,
  );
  return remove(member, principal, dependencies);
};

// Anyone signed in sees the team's faces: the Client next to her Trainer,
// the Staff in Horario. Only an asset a Staff Member shows now is served.
export const readStaffPhoto = async (
  query: { imageAssetId: string; variant: StaffPhotoVariant },
  _principal: AuthenticatedPrincipal,
  dependencies: { gateway: StaffPhotoGateway },
): Promise<{ objectKey: string; mediaType: string }> => {
  const object = await dependencies.gateway.readPhotoObject(query);
  if (object === null) throw new StaffPhotoError('profile_photo_not_found');
  return object;
};
