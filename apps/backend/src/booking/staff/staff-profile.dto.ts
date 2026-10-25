import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StaffProfile } from './staff-profile';

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

  @ApiProperty({ type: StaffBranchDto, isArray: true })
  branches!: StaffBranchDto[];
}
