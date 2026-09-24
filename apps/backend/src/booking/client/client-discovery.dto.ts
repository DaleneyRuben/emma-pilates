import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import type { ClientSubscriptionStatus } from './client-subscription';

export class UpdateClientProfileDto {
  @ApiProperty({ minLength: 1 })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;
}

const updateClientProfileSchema = z.strictObject({
  name: z.string(),
  phone: z.string().nullable().optional(),
});

export const parseUpdateClientProfile = (
  value: unknown,
): UpdateClientProfileDto | null => {
  const result = updateClientProfileSchema.safeParse(value);
  return result.success
    ? { name: result.data.name, phone: result.data.phone ?? null }
    : null;
};

export const clientSubscriptionStatuses: [
  ClientSubscriptionStatus,
  ...ClientSubscriptionStatus[],
] = ['active', 'expiring_soon', 'expired', 'none'];

// The attached photo's asset id lets a client fetch the photo again when it
// changes; the bytes come from `GET /clients/current/photo` (MOB-020).
export class ClientPhotoDto {
  @ApiProperty({ format: 'uuid' })
  imageAssetId!: string;
}

export class ClientProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty()
  referralCode!: string;

  @ApiPropertyOptional({ type: ClientPhotoDto, nullable: true })
  photo!: ClientPhotoDto | null;
}

export class SetClientPhotoDto {
  @ApiProperty({ format: 'uuid' })
  imageAssetId!: string;
}

const setClientPhotoSchema = z.strictObject({ imageAssetId: z.uuid() });

export const parseSetClientPhoto = (
  value: unknown,
): SetClientPhotoDto | null => {
  const result = setClientPhotoSchema.safeParse(value);
  return result.success ? result.data : null;
};

export class ClientSubscriptionSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  planName!: string;

  @ApiProperty({ minimum: 1 })
  originalClassAllowance!: number;

  @ApiProperty({ minimum: 0 })
  remainingClassAllowance!: number;

  @ApiProperty({ format: 'date' })
  startsOn!: string;

  @ApiProperty({ format: 'date' })
  endsOn!: string;
}

export class ClientSubscriptionDto {
  @ApiProperty({ enum: clientSubscriptionStatuses })
  status!: ClientSubscriptionStatus;

  @ApiPropertyOptional({ type: ClientSubscriptionSummaryDto, nullable: true })
  subscription!: ClientSubscriptionSummaryDto | null;
}

export class PlanDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: [1, 3, 6, 12] })
  durationMonths!: number;

  @ApiProperty({ minimum: 1 })
  classAllowance!: number;

  @ApiProperty({ minimum: 0, description: 'Money Amount in BOB centavos' })
  priceCentavos!: number;
}

export class BranchDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;
}

export class ClassTypeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ minimum: 1 })
  durationMinutes!: number;
}

export class SessionDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: BranchDto })
  branch!: BranchDto;

  @ApiProperty({ type: ClassTypeDto })
  classType!: ClassTypeDto;

  @ApiProperty()
  trainerName!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ minimum: 1 })
  capacity!: number;

  @ApiProperty({ minimum: 0 })
  bookedCount!: number;

  @ApiProperty({ minimum: 0 })
  availableSeats!: number;

  @ApiProperty({ minimum: 0 })
  waitlistCount!: number;
}
