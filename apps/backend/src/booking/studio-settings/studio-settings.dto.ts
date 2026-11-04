import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import type { EditableStudioSettings } from './studio-settings';

const civilDate = {
  type: String,
  format: 'date',
  nullable: true,
  description: 'The studio Opening Date (La Paz), or null while unknown',
} as const;

const bookingWindow = {
  minimum: 1,
  maximum: 30,
  description:
    'Días para reservar por adelantado: a Session is bookable from today through this many La Paz days, counting today (FIX-026)',
} as const;

// GET /studio-rules: what the apps show Clients, read instead of hard-coded
// copy (BKM-004, ADR-0101). Public and briefly cached.
export class StudioRulesDto {
  @ApiProperty({
    description:
      'Minutes before a Session start inside which a Booking is not cancellable',
  })
  cancellationWindowMinutes!: number;

  @ApiProperty({ description: 'Paid Evaluation price in BOB centavos' })
  evaluationPriceCentavos!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The lowest price among the visible Plans, or null when none',
  })
  plansFromPriceCentavos!: number | null;

  @ApiProperty({
    description: 'Days after the purchase a Start Date may be chosen',
  })
  startDateLimitDays!: number;

  @ApiProperty(bookingWindow)
  bookingWindowDays!: number;

  @ApiProperty(civilDate)
  openingDate!: string | null;
}

// The values the Administrator may change on the admin web.
export class StudioSettingsValuesDto {
  @ApiProperty({ minimum: 1, maximum: 20 })
  minimumBookings!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  taxRatePercent!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  renewalTargetMonths1To6Percent!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  renewalTargetMonths7To12Percent!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  renewalTargetFromMonth13Percent!: number;

  @ApiProperty(civilDate)
  openingDate!: string | null;
}

export class UpdateStudioSettingsDto extends StudioSettingsValuesDto {
  @ApiProperty({ description: 'The version the form was read from' })
  expectedVersion!: number;

  @ApiProperty({
    ...bookingWindow,
    required: false,
    description: `${bookingWindow.description}; left out, the value in force stays`,
  })
  bookingWindowDays?: number;
}

// Every Studio Setting, the read-only ones included, for «Reglas del estudio».
export class StudioSettingsDto extends StudioSettingsValuesDto {
  @ApiProperty()
  version!: number;

  @ApiProperty()
  cancellationWindowMinutes!: number;

  @ApiProperty()
  minimumBookingsCheckLeadMinutes!: number;

  @ApiProperty()
  startDateLimitDays!: number;

  @ApiProperty(bookingWindow)
  bookingWindowDays!: number;

  @ApiProperty()
  founderPlaces!: number;

  @ApiProperty()
  founderDiscountPercent!: number;

  @ApiProperty()
  founderGapDays!: number;

  @ApiProperty()
  guestPassesPerClient!: number;

  @ApiProperty()
  invitesPerHostPerMonth!: number;

  @ApiProperty()
  inviteRewardClasses!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'BOB centavos; null for the Coordinator, who sees no amount',
  })
  evaluationPriceCentavos!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'BOB centavos; null for the Coordinator, who sees no amount',
  })
  nutritionistFeeCentavos!: number | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Who saved this version, or null for the seeded one',
  })
  updatedByName!: string | null;
}

const updateSchema = z.strictObject({
  expectedVersion: z.number().int(),
  minimumBookings: z.number(),
  taxRatePercent: z.number(),
  renewalTargetMonths1To6Percent: z.number(),
  renewalTargetMonths7To12Percent: z.number(),
  renewalTargetFromMonth13Percent: z.number(),
  openingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  bookingWindowDays: z.number().optional(),
});

// Shapes only; the ranges are the domain's (studio-settings.ts).
export const parseUpdateStudioSettings = (
  value: unknown,
): { expectedVersion: number; values: EditableStudioSettings } | null => {
  const result = updateSchema.safeParse(value);
  if (!result.success) return null;
  const { expectedVersion, bookingWindowDays, ...values } = result.data;
  return {
    expectedVersion,
    values:
      bookingWindowDays === undefined
        ? values
        : { ...values, bookingWindowDays },
  };
};
