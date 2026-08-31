import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const startClientRegistrationSchema = z.strictObject({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(1),
});

export class StartClientRegistrationDto {
  @ApiProperty({ example: 'Ana Clienta' })
  name!: string;

  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ format: 'password', writeOnly: true })
  password!: string;
}

export class PendingClientRegistrationDto {
  @ApiProperty({ enum: ['verification_required'] })
  status!: 'verification_required';

  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ writeOnly: true })
  registrationContinuation!: string;
}

export function parseStartClientRegistration(
  input: unknown,
): StartClientRegistrationDto | null {
  const result = startClientRegistrationSchema.safeParse(input);

  return result.success ? result.data : null;
}
