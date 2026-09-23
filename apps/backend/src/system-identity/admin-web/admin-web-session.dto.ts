import { ApiProperty } from '@nestjs/swagger';

export class AdminWebPasswordRecoveryResultDto {
  @ApiProperty({ enum: ['recovered', 'expired', 'invalid'] })
  status!: 'recovered' | 'expired' | 'invalid';

  @ApiProperty({
    description:
      'True when the recovery opened a browser session (Administrators only); the credential travels only in the HttpOnly cookie',
  })
  signedIn!: boolean;
}
