import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class OwnReferralCodeDto {
  @ApiProperty({ type: String, nullable: true, example: 'LUCIA' })
  referralCode!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'When she may change her code again (one change every 30 days); null means now',
  })
  editableFrom!: Date | null;
}

export class ChangeOwnReferralCodeDto {
  @ApiProperty({
    example: 'LU-PILATES',
    description:
      '3 to 20 letters, digits, or hyphens, starting with a letter or digit',
  })
  referralCode!: string;
}

export class ReferralCodeAvailabilityDto {
  @ApiProperty({
    example: 'LUNA',
    description: 'The code as it would be stored',
  })
  code!: string;

  @ApiProperty({
    enum: ['available', 'in_use', 'blocked', 'malformed', 'current'],
    description:
      '`in_use`: another Client or Trainer holds or held it; `blocked`: a reserved or blocked word; `current`: already hers',
  })
  status!: 'available' | 'in_use' | 'blocked' | 'malformed' | 'current';
}

export const parseChangeOwnReferralCode = (value: unknown) =>
  z.strictObject({ referralCode: z.string().max(64) }).safeParse(value);

export const parseAvailabilityQuery = (value: unknown) =>
  z.string().min(1).max(64).safeParse(value);
