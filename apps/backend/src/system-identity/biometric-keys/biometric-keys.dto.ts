import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const secretDescription = 'Opaque 43-character secret, returned only once';

export class BiometricKeyDto {
  @ApiProperty({
    description: `${secretDescription}; replaced by every exchange`,
  })
  deviceKey!: string;

  @ApiProperty({
    description: `${secretDescription}; kept behind the phone's biometrics`,
  })
  unlockSecret!: string;
}

export class ExchangeBiometricKeyDto {
  @ApiProperty({ minLength: 43, maxLength: 43 })
  deviceKey!: string;

  @ApiProperty({ minLength: 43, maxLength: 43 })
  unlockSecret!: string;
}

export class BiometricKeyExchangeDto {
  @ApiProperty({ description: 'Opaque bearer credential returned only once' })
  credential!: string;

  @ApiProperty({
    description: 'The next device key; the one sent stops working',
  })
  deviceKey!: string;
}

export class RevokeBiometricKeyDto {
  @ApiProperty({ minLength: 43, maxLength: 43 })
  deviceKey!: string;
}

const secret = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const parseExchangeBiometricKey = (value: unknown) =>
  z.object({ deviceKey: secret, unlockSecret: secret }).safeParse(value);

export const parseRevokeBiometricKey = (value: unknown) =>
  z.object({ deviceKey: secret }).safeParse(value);
