import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class CreateAuthenticationSessionDto {
  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ format: 'password', minLength: 1 })
  password!: string;
}

export class AuthenticationSessionCredentialDto {
  @ApiProperty({ description: 'Opaque bearer credential returned only once' })
  credential!: string;
}

export class CurrentAuthenticationPrincipalDto {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  identity!: Record<string, unknown>;
}

const createAuthenticationSessionSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const parseCreateAuthenticationSession = (
  value: unknown,
): CreateAuthenticationSessionDto | null => {
  const result = createAuthenticationSessionSchema.safeParse(value);

  return result.success ? result.data : null;
};
