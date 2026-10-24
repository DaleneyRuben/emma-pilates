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

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      '«Clases extra: 1 · Regalo de bienvenida» when extra classes remain',
  })
  extraClassesLine?: string | null;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    nullable: true,
    description:
      'Classes left this week from the base allowance. Absent without a cap.',
  })
  classesLeftThisWeek?: number | null;
}

export class ClientSubscriptionDto {
  @ApiProperty({ enum: clientSubscriptionStatuses })
  status!: ClientSubscriptionStatus;

  @ApiPropertyOptional({ type: ClientSubscriptionSummaryDto, nullable: true })
  subscription!: ClientSubscriptionSummaryDto | null;

  @ApiPropertyOptional({
    type: ClientSubscriptionSummaryDto,
    nullable: true,
    description:
      'The one future Subscription from an Early Renewal. Absent when there is none.',
  })
  nextSubscription?: ClientSubscriptionSummaryDto | null;

  @ApiPropertyOptional({
    format: 'date',
    description:
      'A founder renews before this date. Absent when she is not a founder or has no current Subscription.',
  })
  founderRenewalDeadline?: string | null;

  @ApiPropertyOptional({
    type: () => ClientFreezeDto,
    nullable: true,
    description:
      'The one Freeze of the current Subscription. Absent when there is none.',
  })
  freeze?: ClientFreezeDto | null;

  @ApiPropertyOptional({
    description:
      'True when the current Plan lasts 90 days or more and has no Freeze yet.',
  })
  canRequestFreeze?: boolean;
}

export class ClientFreezeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['requested', 'approved', 'refused'] })
  state!: 'requested' | 'approved' | 'refused';

  @ApiProperty({ format: 'date' })
  startsOn!: string;

  @ApiProperty({ format: 'date' })
  endsOn!: string;
}

export class PlanDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: [30, 60, 90] })
  durationDays!: number;

  @ApiProperty({
    type: Number,
    enum: [3, 4],
    nullable: true,
    description: 'Most Bookings a week from the base allowance',
  })
  weeklyClassCap!: number | null;

  @ApiProperty({
    enum: [1, 2, 3],
    deprecated: true,
    description: 'durationDays / 30, for builds that still read months',
  })
  durationMonths!: number;

  @ApiProperty({ minimum: 1 })
  classAllowance!: number;

  @ApiProperty({ minimum: 0, description: 'Money Amount in BOB centavos' })
  priceCentavos!: number;

  @ApiPropertyOptional({
    minimum: 0,
    description:
      'List price when priceCentavos is a founder discount. Absent otherwise, so older builds ignore it.',
  })
  listPriceCentavos?: number;
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

  @ApiProperty({
    minimum: 1,
    deprecated: true,
    description:
      'A Class Type has no duration: on a Session it is that Session’s length; in the catalog it is always 60. Read the Session’s startsAt and endsAt instead.',
  })
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

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    nullable: true,
    description:
      'Classes left this week from the base allowance. Absent without a cap.',
  })
  classesLeftThisWeek?: number | null;
}
