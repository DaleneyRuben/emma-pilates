import { StaffPhotoDto } from './photo/staff-photo.dto';
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
  'coordinator',
] as const satisfies readonly StaffRoleName[];
const staffStatuses = [
  'pending',
  'active',
  'deactivated',
] as const satisfies readonly StaffStatus[];

// FIX-039: the login email the studio asked for, until its link is opened.
export class StaffPendingEmailDto {
  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When the link sent to the new address stops working',
  })
  expiresAt!: Date;
}

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

  @ApiProperty({
    type: StaffPhotoDto,
    nullable: true,
    description:
      'Her profile photo (FIX-041), null while her initials stand in',
  })
  photo!: StaffPhotoDto | null;

  @ApiProperty({
    type: StaffPendingEmailDto,
    nullable: true,
    description:
      "An active member's email change waiting for the new address to confirm (FIX-039); her login email stays `email` until then",
  })
  pendingEmail!: StaffPendingEmailDto | null;

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

// FIX-038: the Administrator's correction of another member's contact. The
// phone follows decision §19.20 on the server too (`normalizeContactPhone`).
export class ChangeStaffContactDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  name!: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 40 })
  phone!: string | null;
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

const contactSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).nullable(),
});

export const parseChangeStaffContact = (value: unknown) => {
  const parsed = contactSchema.safeParse(value);
  if (!parsed.success) return null;
  const { name, phone } = parsed.data;
  return { name, phone: phone === '' ? null : phone };
};

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
