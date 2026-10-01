import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const optionalPhone = z
  .string()
  .trim()
  .min(6)
  .max(32)
  .nullable()
  .optional()
  .transform((value) => (value === undefined || value === '' ? null : value));

const inviteClientSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  phone: optionalPhone,
});

const correctEmailSchema = z.strictObject({ email: z.email() });

export class InviteClientDto {
  @ApiProperty({ example: 'Ana Nueva' })
  name!: string;

  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  email!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+591 70000000',
  })
  phone?: string | null;
}

export const parseInviteClient = (
  value: unknown,
): { name: string; email: string; phone: string | null } | null => {
  const result = inviteClientSchema.safeParse(value);
  return result.success ? result.data : null;
};

export class CorrectInvitationEmailDto {
  @ApiProperty({ example: 'corregida@example.com', format: 'email' })
  email!: string;
}

export const parseCorrectInvitationEmail = (
  value: unknown,
): { email: string } | null => {
  const result = correctEmailSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const inviteClientStatuses = [
  'invited',
  'invitation_resent',
  'verification_pending',
] as const;

export class ClientInvitationResultDto {
  @ApiProperty({
    enum: inviteClientStatuses,
    description:
      'invited: new pending Client; invitation_resent: the email already had a pending invitation and received a fresh link; verification_pending: the email belongs to a pending self-registration; nothing was sent, and the verification link is offered separately',
  })
  status!: (typeof inviteClientStatuses)[number];

  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty({ format: 'email' })
  email!: string;
}

export class ClientVerificationEmailDto {
  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty({ format: 'email' })
  email!: string;
}

export class ClientInvitationDto {
  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({
    format: 'date-time',
    description: 'When the pending invitation is removed unless activated',
  })
  pendingExpiresAt!: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Expiry of the current activation link',
  })
  activationExpiresAt!: Date | null;

  @ApiProperty({
    description:
      'False once the Client holds a Subscription, Payment, or Booking',
  })
  cancellable!: boolean;
}
