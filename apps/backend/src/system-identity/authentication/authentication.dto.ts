import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { z } from 'zod';
import { ImpersonationDto } from '../impersonation/impersonation.dto';

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

export class ClientAuthenticationIdentityDto {
  @ApiProperty({ enum: ['client'] })
  kind!: 'client';

  @ApiProperty({ format: 'uuid' })
  clientId!: string;
}

export class StaffAuthenticationIdentityDto {
  @ApiProperty({ enum: ['staff'] })
  kind!: 'staff';

  @ApiProperty({ format: 'uuid' })
  staffMemberId!: string;

  @ApiProperty({
    enum: [
      'trainer',
      'nutritionist',
      'assistant',
      'administrator',
      'coordinator',
    ],
  })
  role!:
    'trainer' | 'nutritionist' | 'assistant' | 'administrator' | 'coordinator';

  @ApiProperty({ type: [String], format: 'uuid' })
  branchIds!: string[];
}

export class CurrentAuthenticationPrincipalDto {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(ClientAuthenticationIdentityDto) },
      { $ref: getSchemaPath(StaffAuthenticationIdentityDto) },
    ],
    discriminator: { propertyName: 'kind' },
  })
  identity!: ClientAuthenticationIdentityDto | StaffAuthenticationIdentityDto;

  @ApiProperty({
    type: ImpersonationDto,
    required: false,
    description:
      'Present while an Administrator sees the Staff app as this Staff Member (FUT-001)',
  })
  impersonation?: ImpersonationDto;
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
