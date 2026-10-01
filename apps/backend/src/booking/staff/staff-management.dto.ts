import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import type {
  StaffDirectoryQuery,
  StaffRoleName,
  StaffStatus,
} from './staff-management';

const staffRoles = [
  'trainer',
  'nutritionist',
  'assistant',
  'administrator',
] as const satisfies readonly StaffRoleName[];
const staffStatuses = [
  'pending',
  'active',
  'deactivated',
] as const satisfies readonly StaffStatus[];

export class StaffMemberDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: staffRoles })
  role!: StaffRoleName;

  @ApiProperty({
    type: String,
    format: 'uuid',
    isArray: true,
    description: 'Empty for Administrators, who hold every Branch implicitly',
  })
  branchIds!: string[];

  @ApiProperty({ enum: staffStatuses })
  status!: StaffStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Expiry of the current Activation Link while pending',
  })
  activationExpiresAt!: Date | null;

  @ApiPropertyOptional({
    description:
      'true when the create reopened a pending invitation with the same email; its Role and Branches did not change',
  })
  invitationReopened?: boolean;
}

export class CorrectStaffEmailDto {
  @ApiProperty({ format: 'email' })
  email!: string;
}

export class StaffMemberPageDto {
  @ApiProperty({ type: StaffMemberDto, isArray: true })
  items!: StaffMemberDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  totalItems!: number;
}

export class CreateStaffMemberDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: String, nullable: true, required: false })
  phone?: string | null;

  @ApiProperty({ enum: staffRoles })
  role!: StaffRoleName;

  @ApiProperty({ type: String, format: 'uuid', isArray: true })
  branchIds!: string[];
}

export class ChangeStaffRoleDto {
  @ApiProperty({ enum: staffRoles })
  role!: StaffRoleName;

  @ApiProperty({
    type: String,
    format: 'uuid',
    isArray: true,
    required: false,
    description:
      'Required when leaving Administrator; otherwise replaces the current Branches',
  })
  branchIds?: string[];
}

export class ChangeStaffBranchesDto {
  @ApiProperty({ type: String, format: 'uuid', isArray: true })
  branchIds!: string[];
}

const branchIdsSchema = z.array(z.uuid()).max(50);

const createSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  phone: z.string().trim().min(1).max(40).nullable().optional(),
  role: z.enum(staffRoles),
  branchIds: branchIdsSchema,
});

const roleSchema = z.strictObject({
  role: z.enum(staffRoles),
  branchIds: branchIdsSchema.optional(),
});

const branchesSchema = z.strictObject({ branchIds: branchIdsSchema });

const emailCorrectionSchema = z.strictObject({ email: z.email() });

export const parseCorrectStaffEmail = (value: unknown) => {
  const parsed = emailCorrectionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const querySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(staffRoles).optional(),
  branchId: z.uuid().optional(),
  status: z.enum(staffStatuses).optional(),
});

export const parseCreateStaffMember = (value: unknown) => {
  const parsed = createSchema.safeParse(value);
  return parsed.success
    ? { ...parsed.data, phone: parsed.data.phone ?? null }
    : null;
};

export const parseChangeStaffRole = (value: unknown) => {
  const parsed = roleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const parseChangeStaffBranches = (value: unknown) => {
  const parsed = branchesSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const parseStaffDirectoryQuery = (
  value: unknown,
): StaffDirectoryQuery | null => {
  const parsed = querySchema.safeParse(value);
  if (!parsed.success) return null;
  const { role, branchId, status, ...paging } = parsed.data;
  return {
    ...paging,
    ...(role === undefined ? {} : { role }),
    ...(branchId === undefined ? {} : { branchId }),
    ...(status === undefined ? {} : { status }),
  };
};

export const parseStaffMemberId = (value: string): string | null => {
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
};
