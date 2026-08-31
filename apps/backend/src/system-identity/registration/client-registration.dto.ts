import { ApiProperty } from '@nestjs/swagger';

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
