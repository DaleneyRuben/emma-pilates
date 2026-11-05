import { Controller } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import type { StaffPhotoResult, StaffPhotoVariant } from './staff-photo';

export const staffPhotoOperations = Symbol('staffPhotoOperations');
export const staffPhotoObjectStorage = Symbol('staffPhotoObjectStorage');

export type StaffPhotoOperations = {
  setOwn: (
    command: { imageAssetId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<StaffPhotoResult>;
  removeOwn: (principal: AuthenticatedPrincipal) => Promise<StaffPhotoResult>;
  setMember: (
    command: { staffMemberId: string; imageAssetId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<StaffPhotoResult>;
  removeMember: (
    command: { staffMemberId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<StaffPhotoResult>;
  read: (
    query: { imageAssetId: string; variant: StaffPhotoVariant },
    principal: AuthenticatedPrincipal,
  ) => Promise<{ objectKey: string; mediaType: string }>;
};

@Controller({ version: '1' })
export class StaffPhotoController {}
