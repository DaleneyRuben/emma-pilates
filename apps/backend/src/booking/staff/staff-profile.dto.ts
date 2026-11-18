import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffPhotoDto } from './photo/staff-photo.dto';
import type { StaffProfile } from './staff-profile';
import { staffGenders } from '../../system-identity/authentication/staff-gender';

export const staffRoles: [StaffProfile['role'], ...StaffProfile['role'][]] = [
  'trainer',
  'nutritionist',
  'assistant',
  'administrator',
  'coordinator',
];

export class StaffBranchDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class StaffProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: staffRoles })
  role!: StaffProfile['role'];

  @ApiProperty({
    enum: staffGenders,
    description: 'How her Role reads (FIX-081)',
  })
  gender!: StaffProfile['gender'];

  @ApiProperty({ type: StaffBranchDto, isArray: true })
  branches!: StaffBranchDto[];

  @ApiProperty({
    type: StaffPhotoDto,
    nullable: true,
    description:
      'Her profile photo (FIX-041), null while her initials stand in',
  })
  photo!: StaffPhotoDto | null;
}
