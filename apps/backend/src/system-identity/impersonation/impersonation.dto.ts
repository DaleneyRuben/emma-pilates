import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import type { ImpersonationView } from './impersonation';

export class StartImpersonationDto {
  @ApiProperty({ format: 'uuid' })
  staffMemberId!: string;
}

const impersonableRoles = [
  'trainer',
  'assistant',
  'nutritionist',
  'coordinator',
] as const;

export class ImpersonationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  staffMemberId!: string;

  @ApiProperty()
  staffMemberName!: string;

  @ApiProperty({ enum: impersonableRoles })
  role!: (typeof impersonableRoles)[number];

  @ApiProperty({ format: 'date-time', description: 'When the 30 minutes end' })
  expiresAt!: string;
}

const startSchema = z.object({ staffMemberId: z.uuid() });

export const parseStartImpersonation = (
  value: unknown,
): StartImpersonationDto | null => {
  const result = startSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const toImpersonationDto = (
  view: ImpersonationView,
): ImpersonationDto => ({
  id: view.id,
  staffMemberId: view.staffMemberId,
  staffMemberName: view.staffMemberName,
  role: view.role,
  expiresAt: view.expiresAt.toISOString(),
});
