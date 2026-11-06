import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

// FIX-041: the photo a Staff Member shows, by its asset, so a changed photo
// is a new URL to fetch (`GET /staff-photos/{imageAssetId}`).
export class StaffPhotoDto {
  @ApiProperty({ format: 'uuid' })
  imageAssetId!: string;
}

export class StaffPhotoResultDto {
  @ApiProperty({ format: 'uuid' })
  staffMemberId!: string;

  @ApiProperty({ type: StaffPhotoDto, nullable: true })
  photo!: StaffPhotoDto | null;
}

export class SetStaffPhotoDto {
  @ApiProperty({ format: 'uuid' })
  imageAssetId!: string;
}

const setStaffPhotoSchema = z.strictObject({ imageAssetId: z.uuid() });

export const parseSetStaffPhoto = (value: unknown): SetStaffPhotoDto | null => {
  const result = setStaffPhotoSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const isUuid = (value: string): boolean =>
  z.uuid().safeParse(value).success;
