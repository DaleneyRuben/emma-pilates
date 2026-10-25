import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import {
  declaredAcquisitionChannels,
  type DeclaredAcquisitionChannel,
} from '../../booking/acquisition/acquisition';

const startClientRegistrationSchema = z.strictObject({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(1),
  referralCode: z.string().trim().min(1).max(64).optional(),
  acquisitionChannel: z.enum(declaredAcquisitionChannels).optional(),
});

const correctPendingClientEmailSchema = z.strictObject({
  registrationContinuation: z.string().min(1),
  email: z.email(),
});

const pendingRegistrationContinuationSchema = z.strictObject({
  registrationContinuation: z.string().min(1),
});

export class StartClientRegistrationDto {
  @ApiProperty({ example: 'Ana Clienta' })
  name!: string;

  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ format: 'password', writeOnly: true })
  password!: string;

  @ApiPropertyOptional({
    example: 'REF-LUCIA',
    description:
      'Referral Code of the Client or Trainer who brought this person; it decides the Acquisition Channel (BKM-011)',
  })
  referralCode?: string;

  @ApiPropertyOptional({
    enum: declaredAcquisitionChannels,
    description:
      '«¿Cómo nos conociste?» Required by current builds; a build that omits it registers as `unknown` (BKM-011)',
  })
  acquisitionChannel?: DeclaredAcquisitionChannel;
}

export class PendingClientRegistrationDto {
  @ApiProperty({ enum: ['verification_required'] })
  status!: 'verification_required';

  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ writeOnly: true })
  registrationContinuation!: string;
}

export class CorrectPendingClientEmailDto {
  @ApiProperty({ writeOnly: true })
  registrationContinuation!: string;

  @ApiProperty({ example: 'corrected@example.com', format: 'email' })
  email!: string;
}

export class PendingEmailCorrectionDto {
  @ApiProperty({ enum: ['verification_required'] })
  status!: 'verification_required';

  @ApiProperty({ example: 'corrected@example.com', format: 'email' })
  email!: string;
}

export class PendingRegistrationContinuationDto {
  @ApiProperty({ writeOnly: true })
  registrationContinuation!: string;
}

export class PendingVerificationResendDto {
  @ApiProperty({ enum: ['verification_required'] })
  status!: 'verification_required';
}

export function parseStartClientRegistration(
  input: unknown,
): StartClientRegistrationDto | null {
  const result = startClientRegistrationSchema.safeParse(input);

  return result.success ? result.data : null;
}

export function parseCorrectPendingClientEmail(
  input: unknown,
): CorrectPendingClientEmailDto | null {
  const result = correctPendingClientEmailSchema.safeParse(input);

  return result.success ? result.data : null;
}

export function parsePendingRegistrationContinuation(
  input: unknown,
): PendingRegistrationContinuationDto | null {
  const result = pendingRegistrationContinuationSchema.safeParse(input);

  return result.success ? result.data : null;
}
