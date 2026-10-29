import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const calendarDate = z.iso.date();
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const pageLimit = z.coerce.number().int().min(1).max(50);
const toCivilDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const civilDate = (date: Date): string =>
  date.toISOString().slice(0, 10);

export class EvaluationSlotDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ example: 45 })
  durationMinutes!: number;

  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty()
  nutritionistName!: string;

  @ApiProperty({
    description:
      'Published, unbooked, more than 3 hours away, and covered by an active Subscription',
  })
  bookable!: boolean;

  @ApiProperty({
    description:
      'True when the covering Plan of 90 days or longer still includes its Evaluation',
  })
  included!: boolean;

  @ApiProperty({
    description:
      'Settings price in centavos; 0 when the Evaluation is included',
  })
  priceCentavos!: number;
}

export class EvaluationDayDto {
  @ApiProperty({ format: 'date', description: 'Bolivia civil date' })
  date!: string;

  @ApiProperty({ type: EvaluationSlotDto, isArray: true })
  slots!: EvaluationSlotDto[];
}

export class EvaluationMonthUseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;
}

export class EvaluationMonthDto {
  @ApiProperty({
    format: 'date',
    description: 'First day of the Bolivia month',
  })
  month!: string;

  @ApiProperty({ enum: ['available', 'used'] })
  status!: 'available' | 'used';

  @ApiProperty({ type: EvaluationMonthUseDto, nullable: true })
  evaluation!: EvaluationMonthUseDto | null;
}

export class EvaluationAvailabilityDto {
  @ApiProperty({ type: EvaluationDayDto, isArray: true })
  days!: EvaluationDayDto[];

  @ApiProperty({ type: EvaluationMonthDto, isArray: true })
  months!: EvaluationMonthDto[];
}

export class ClientEvaluationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  slotId!: string;

  @ApiProperty()
  included!: boolean;

  @ApiProperty({ description: 'Charged centavos; 0 when included or unpaid' })
  priceCentavos!: number;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  paymentId!: string | null;

  @ApiProperty({
    description:
      'A paid Evaluation still needs its transfer receipt. Older builds ignore it.',
  })
  receiptAttached!: boolean;

  @ApiProperty({ enum: ['booked', 'cancelled', 'no_show'] })
  state!: 'booked' | 'cancelled' | 'no_show';

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ example: 45 })
  durationMinutes!: number;

  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty()
  nutritionistName!: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Start minus 3 hours; the Client cannot cancel after it',
  })
  cancellableUntil!: Date;

  @ApiProperty()
  cancellable!: boolean;
}

export class ClientEvaluationPageDto {
  @ApiProperty({ type: ClientEvaluationDto, isArray: true })
  items!: ClientEvaluationDto[];

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class NutritionistAgendaEntryDto {
  @ApiProperty({ format: 'uuid' })
  evaluationId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ example: 45 })
  durationMinutes!: number;

  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty({
    enum: ['first', 'follow_up'],
    description: 'first unless the Client has an earlier booked Evaluation',
  })
  kind!: 'first' | 'follow_up';
}

export class NutritionistAgendaPageDto {
  @ApiProperty({ type: NutritionistAgendaEntryDto, isArray: true })
  items!: NutritionistAgendaEntryDto[];

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class AvailabilityBlockInputDto {
  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty({
    minimum: 1,
    maximum: 7,
    description: 'ISO weekday, Monday = 1',
  })
  weekday!: number;

  @ApiProperty({
    example: '09:00',
    description: 'Bolivia wall clock, 15-minute grid',
  })
  startsAtLocal!: string;

  @ApiProperty({
    example: '13:00',
    description: 'Bolivia wall clock, 15-minute grid',
  })
  endsAtLocal!: string;

  @ApiProperty({
    format: 'date',
    description: 'First Bolivia date the block applies; today or later',
  })
  effectiveFrom!: string;
}

export class AvailabilityBlockEndInputDto {
  @ApiProperty({
    format: 'date',
    description: 'First Bolivia date without the block; today or later',
  })
  effectiveFrom!: string;
}

export class AvailabilityBlockDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty({ minimum: 1, maximum: 7 })
  weekday!: number;

  @ApiProperty({ example: '09:00' })
  startsAtLocal!: string;

  @ApiProperty({ example: '13:00' })
  endsAtLocal!: string;

  @ApiProperty({ format: 'date' })
  effectiveFrom!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'Exclusive end; null while open-ended',
  })
  effectiveUntil!: string | null;

  @ApiProperty()
  slotsPerWeek!: number;

  @ApiProperty()
  upcomingBookedCount!: number;
}

export class AvailabilityBlockReplacementDto {
  @ApiProperty({ type: AvailabilityBlockDto })
  ended!: AvailabilityBlockDto;

  @ApiProperty({ type: AvailabilityBlockDto })
  replacement!: AvailabilityBlockDto;

  @ApiProperty()
  withdrawnSlots!: number;

  @ApiProperty({ description: 'Booked Evaluations that keep their slots' })
  keptEvaluations!: number;
}

export class AvailabilityBlockEndDto {
  @ApiProperty({ type: AvailabilityBlockDto })
  block!: AvailabilityBlockDto;

  @ApiProperty()
  withdrawnSlots!: number;

  @ApiProperty({ description: 'Booked Evaluations that keep their slots' })
  keptEvaluations!: number;
}

const slotQuerySchema = z.strictObject({
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  branchId: z.uuid().optional(),
});

export const parseSlotQuery = (
  value: unknown,
): { from?: Date; to?: Date; branchId?: string } | null => {
  const result = slotQuerySchema.safeParse(value);
  if (!result.success) return null;
  return {
    ...(result.data.from === undefined
      ? {}
      : { from: toCivilDate(result.data.from) }),
    ...(result.data.to === undefined
      ? {}
      : { to: toCivilDate(result.data.to) }),
    ...(result.data.branchId === undefined
      ? {}
      : { branchId: result.data.branchId }),
  };
};

const clientEvaluationQuerySchema = z.strictObject({
  scope: z.enum(['upcoming', 'past']),
  cursor: z.string().min(1).max(200).optional(),
  limit: pageLimit.optional(),
});

export const parseClientEvaluationQuery = (
  value: unknown,
): {
  scope: 'upcoming' | 'past';
  cursor?: string;
  limit?: number;
} | null => {
  const result = clientEvaluationQuerySchema.safeParse(value);
  return result.success ? result.data : null;
};

const agendaQuerySchema = z.strictObject({
  from: calendarDate.optional(),
  cursor: z.string().min(1).max(200).optional(),
  limit: pageLimit.optional(),
});

export const parseAgendaQuery = (
  value: unknown,
): { from?: Date; cursor?: string; limit?: number } | null => {
  const result = agendaQuerySchema.safeParse(value);
  if (!result.success) return null;
  const { from, ...rest } = result.data;
  return {
    ...(from === undefined ? {} : { from: toCivilDate(from) }),
    ...rest,
  };
};

const blockInputSchema = z.strictObject({
  branchId: z.uuid(),
  weekday: z.number().int().min(1).max(7),
  startsAtLocal: clock,
  endsAtLocal: clock,
  effectiveFrom: calendarDate,
});

export const parseAvailabilityBlockInput = (
  value: unknown,
): {
  branchId: string;
  weekday: number;
  startsAtLocal: string;
  endsAtLocal: string;
  effectiveFrom: Date;
} | null => {
  const result = blockInputSchema.safeParse(value);
  return result.success
    ? { ...result.data, effectiveFrom: toCivilDate(result.data.effectiveFrom) }
    : null;
};

export const parseAvailabilityBlockEnd = (
  value: unknown,
): { effectiveFrom: Date } | null => {
  const result = z
    .strictObject({ effectiveFrom: calendarDate })
    .safeParse(value);
  return result.success
    ? { effectiveFrom: toCivilDate(result.data.effectiveFrom) }
    : null;
};
