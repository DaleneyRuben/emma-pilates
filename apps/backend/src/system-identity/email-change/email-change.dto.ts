import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import type { EmailChangeCompletionStatus } from './email-change';

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'lucia.nueva@example.com', format: 'email' })
  email!: string;
}

export class EmailChangeRequestResultDto {
  @ApiProperty({ enum: ['verification_required'] })
  status!: 'verification_required';

  @ApiProperty({ format: 'email' })
  email!: string;
}

export class EmailChangeResendResultDto {
  @ApiProperty({ enum: ['verification_required'] })
  status!: 'verification_required';
}

export class PendingEmailChangeDto {
  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ format: 'date-time' })
  requestedAt!: Date;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: Date;
}

export class PendingEmailChangeStateDto {
  @ApiPropertyOptional({ type: PendingEmailChangeDto, nullable: true })
  pending!: PendingEmailChangeDto | null;
}

export class CompleteEmailChangeDto {
  @ApiProperty({ writeOnly: true })
  token!: string;
}

export class EmailChangeCompletionResultDto {
  @ApiProperty({ enum: ['changed', 'expired', 'invalid', 'email_unavailable'] })
  status!: EmailChangeCompletionStatus;
}

const requestSchema = z.strictObject({ email: z.email() });
const completionSchema = z.strictObject({ token: z.string().min(1) });

export const parseEmailChangeRequest = (value: unknown) =>
  requestSchema.safeParse(value);
export const parseEmailChangeCompletion = (value: unknown) =>
  completionSchema.safeParse(value);
