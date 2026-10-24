import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import {
  acquisitionChannels,
  declaredAcquisitionChannels,
  type AcquisitionChannel,
  type DeclaredAcquisitionChannel,
} from './acquisition';

export class AcquisitionReferrerDto {
  @ApiProperty({ enum: ['client', 'trainer'] })
  kind!: 'client' | 'trainer';

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ClientAcquisitionDto {
  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty({
    enum: acquisitionChannels,
    description:
      'The attribution: a Referral Code makes it `friend` (a Client’s) or `trainer` (a Trainer’s); `unknown` before the question existed',
  })
  channel!: AcquisitionChannel;

  @ApiProperty({
    enum: acquisitionChannels,
    description: 'What she answered to «¿Cómo nos conociste?»',
  })
  declaredChannel!: AcquisitionChannel;

  @ApiProperty({ type: String, nullable: true })
  referralCode!: string | null;

  @ApiProperty({ type: AcquisitionReferrerDto, nullable: true })
  referrer!: AcquisitionReferrerDto | null;
}

export class CorrectClientAcquisitionDto {
  @ApiProperty({ enum: declaredAcquisitionChannels })
  channel!: DeclaredAcquisitionChannel;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'A Client’s or Trainer’s Referral Code; it wins over the channel',
  })
  referralCode!: string | null;
}

export class TrainerReferralCodeDto {
  @ApiProperty({ format: 'uuid' })
  staffMemberId!: string;

  @ApiProperty({ type: String, nullable: true, example: 'CARLA' })
  referralCode!: string | null;
}

export class SetTrainerReferralCodeDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'CARLA',
    description:
      '3 to 20 letters, digits, or hyphens, not starting with REF-; null removes the code',
  })
  referralCode!: string | null;
}

const optionalCode = z
  .string()
  .trim()
  .max(64)
  .nullable()
  .transform((value) => (value === null || value === '' ? null : value));

export const parseCorrectClientAcquisition = (value: unknown) =>
  z
    .strictObject({
      channel: z.enum(declaredAcquisitionChannels),
      referralCode: optionalCode.optional().transform((code) => code ?? null),
    })
    .safeParse(value);

export const parseSetTrainerReferralCode = (value: unknown) =>
  z.strictObject({ referralCode: optionalCode }).safeParse(value);
