import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthenticationLinkInspection } from './authentication-links';

export class AuthenticationLinkTokenDto {
  @ApiProperty({ writeOnly: true })
  token!: string;
}

export class AuthenticationLinkInspectionDto {
  @ApiProperty({ enum: ['current', 'expired', 'invalid'] })
  status!: 'current' | 'expired' | 'invalid';

  @ApiPropertyOptional({ enum: ['activation', 'password_recovery'] })
  purpose?: 'activation' | 'password_recovery';
}

export class CompleteAccountActivationDto extends AuthenticationLinkTokenDto {
  @ApiProperty({ format: 'password', minLength: 1, writeOnly: true })
  password!: string;
}

export class AccountActivationResultDto {
  @ApiProperty({ enum: ['activated', 'expired', 'invalid'] })
  status!: 'activated' | 'expired' | 'invalid';
}

export class RequestPasswordRecoveryDto {
  @ApiProperty({ format: 'email' })
  email!: string;
}

export class PasswordRecoveryRequestResultDto {
  @ApiProperty({ enum: ['accepted'] })
  status!: 'accepted';
}

export class CompletePasswordRecoveryDto extends AuthenticationLinkTokenDto {
  @ApiProperty({ format: 'password', minLength: 1, writeOnly: true })
  password!: string;
}

export class PasswordRecoveryResultDto {
  @ApiProperty({ enum: ['recovered', 'expired', 'invalid'] })
  status!: 'recovered' | 'expired' | 'invalid';

  @ApiPropertyOptional({
    description: 'Opaque bearer credential returned once',
  })
  credential?: string;
}

export class ChangeCurrentPasswordDto {
  @ApiProperty({ format: 'password', minLength: 1, writeOnly: true })
  currentPassword!: string;

  @ApiProperty({ format: 'password', minLength: 1, writeOnly: true })
  newPassword!: string;
}

const tokenSchema = z.strictObject({ token: z.string().min(1) });
const passwordSchema = tokenSchema.extend({ password: z.string().min(1) });
const recoveryRequestSchema = z.strictObject({ email: z.email() });
const passwordChangeSchema = z.strictObject({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export const parseAuthenticationLinkToken = (value: unknown) =>
  tokenSchema.safeParse(value);
export const parsePasswordLink = (value: unknown) =>
  passwordSchema.safeParse(value);
export const parseRecoveryRequest = (value: unknown) =>
  recoveryRequestSchema.safeParse(value);
export const parsePasswordChange = (value: unknown) =>
  passwordChangeSchema.safeParse(value);

export const toAuthenticationLinkInspectionDto = (
  result: AuthenticationLinkInspection,
): AuthenticationLinkInspectionDto => result;
