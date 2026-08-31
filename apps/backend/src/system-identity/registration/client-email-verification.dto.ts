import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import type { ClientEmailVerificationStatus } from './verify-client-email';

const clientEmailVerificationSchema = z.strictObject({
  verificationToken: z.string().min(1),
});

export class VerifyClientEmailDto {
  @ApiProperty({ writeOnly: true })
  verificationToken!: string;
}

export class ClientEmailVerificationResultDto {
  @ApiProperty({ enum: ['verified', 'expired', 'invalid'] })
  status!: ClientEmailVerificationStatus;
}

export function parseClientEmailVerification(
  input: unknown,
): VerifyClientEmailDto | null {
  const result = clientEmailVerificationSchema.safeParse(input);

  return result.success ? result.data : null;
}
