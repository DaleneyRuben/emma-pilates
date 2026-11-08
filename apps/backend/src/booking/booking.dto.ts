import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { StaffPhotoDto } from './staff/photo/staff-photo.dto';
import { ClientPhotoDto } from './client/client-discovery.dto';
import { sessionCancellationCauses } from './sessions/session-cancellation';

export class CreateBookingDto {
  @ApiPropertyOptional({ format: 'uuid' })
  clientId?: string;
}

export class CreatedBookingDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

export class ClassHistoryEntryDto {
  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty()
  classTypeName!: string;

  @ApiProperty()
  trainerName!: string;

  @ApiProperty({
    type: StaffPhotoDto,
    nullable: true,
    description:
      'The Trainer photo (FIX-041), null while her initials stand in',
  })
  trainerPhoto!: StaffPhotoDto | null;

  @ApiProperty()
  branchName!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;
}

export class RescheduleBookingDto {
  @ApiProperty({ format: 'uuid' })
  targetSessionId!: string;
}

export class AttendanceOutcomeDto {
  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ enum: ['attended', 'no_show'] })
  outcome!: 'attended' | 'no_show';
}

export class RecordAttendanceDto {
  @ApiProperty({ type: AttendanceOutcomeDto, isArray: true })
  outcomes!: AttendanceOutcomeDto[];
}

// FIX-042: a cancelled Session the Horario or the Trainer's agenda shows in
// place, with why it was cancelled and how many it had booked by then.
export class SessionCancellationSummaryDto {
  @ApiProperty({ enum: sessionCancellationCauses })
  cause!: (typeof sessionCancellationCauses)[number];

  @ApiProperty({ format: 'date-time' })
  cancelledAt!: Date;

  @ApiProperty({ minimum: 0 })
  bookedCount!: number;
}

export class SessionAvailabilityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty({ format: 'uuid' })
  classTypeId!: string;

  @ApiProperty({ format: 'uuid' })
  trainerStaffMemberId!: string;

  @ApiProperty()
  classTypeName!: string;

  @ApiProperty()
  trainerName!: string;

  @ApiProperty({
    type: StaffPhotoDto,
    nullable: true,
    description:
      'The Trainer photo (FIX-041), null while her initials stand in',
  })
  trainerPhoto!: StaffPhotoDto | null;

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
      'Classes left this week from the base allowance. Absent when the Plan has no cap or the caller is not a Client.',
  })
  classesLeftThisWeek?: number | null;

  @ApiPropertyOptional({
    type: () => SessionCancellationSummaryDto,
    nullable: true,
    description:
      'The cancelled class and its cause, null for a class that stands. The Session availability list sends it only when Staff ask for includeCancelled; the Administrator search always does.',
  })
  cancellation?: SessionCancellationSummaryDto | null;
}

// The Administrator's projection (API-002, WEB-003): the same Session plus
// the weekly schedule that generated it, so an edit can offer "Esta y las
// futuras", and whether it is already an exception.
export class AdministratorSessionAvailabilityDto extends SessionAvailabilityDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sessionScheduleId!: string | null;

  @ApiProperty()
  isException!: boolean;
}

export class TrainerScheduleSessionDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty()
  classTypeName!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ minimum: 1 })
  capacity!: number;

  @ApiProperty({ minimum: 0 })
  bookedCount!: number;

  @ApiPropertyOptional({
    type: () => SessionCancellationSummaryDto,
    nullable: true,
  })
  cancellation?: SessionCancellationSummaryDto | null;
}

export class TrainerRosterBookingDto {
  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({
    type: ClientPhotoDto,
    nullable: true,
    description: 'The Client photo (FIX-041), null while her initials stand in',
  })
  clientPhoto!: ClientPhotoDto | null;

  @ApiPropertyOptional({ enum: ['attended', 'no_show'], nullable: true })
  attendanceOutcome!: 'attended' | 'no_show' | null;
}

export class TrainerSessionRosterDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty()
  classTypeName!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ type: TrainerRosterBookingDto, isArray: true })
  bookings!: TrainerRosterBookingDto[];
}

const createBookingSchema = z.object({
  clientId: z.uuid().optional(),
});
const rescheduleBookingSchema = z.object({ targetSessionId: z.uuid() });
const attendanceSchema = z.object({
  outcomes: z.array(
    z.object({ bookingId: z.uuid(), outcome: z.enum(['attended', 'no_show']) }),
  ),
});
const uuidSchema = z.uuid();
const calendarDateSchema = z.iso.date();

const availabilityQuerySchema = z
  .object({
    branchId: z.uuid(),
    from: z.iso.datetime(),
    until: z.iso.datetime(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    includeCancelled: z.enum(['true', 'false']).optional(),
  })
  .refine(({ from, until }) => new Date(from) < new Date(until), {
    message: 'until must be after from',
  });

export const parseCreateBooking = (value: unknown): CreateBookingDto | null => {
  const result = createBookingSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const parseRescheduleBooking = (
  value: unknown,
): RescheduleBookingDto | null => {
  const result = rescheduleBookingSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const parseAttendance = (value: unknown): RecordAttendanceDto | null => {
  const result = attendanceSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const parseAvailabilityQuery = (
  value: unknown,
): {
  branchId: string;
  from: Date;
  until: Date;
  limit: number;
  includeCancelled?: true;
} | null => {
  const result = availabilityQuerySchema.safeParse(value);
  if (!result.success) return null;

  return {
    branchId: result.data.branchId,
    from: new Date(result.data.from),
    until: new Date(result.data.until),
    limit: result.data.limit,
    ...(result.data.includeCancelled === 'true'
      ? { includeCancelled: true as const }
      : {}),
  };
};

const administratorSessionQuerySchema = z
  .strictObject({
    from: z.iso.datetime(),
    until: z.iso.datetime(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    branchId: z.uuid().optional(),
    includeCancelled: z.enum(['true', 'false']).optional(),
  })
  .refine(({ from, until }) => new Date(from) < new Date(until), {
    message: 'until must be after from',
  });

export const parseAdministratorSessionQuery = (
  value: unknown,
): {
  from: Date;
  until: Date;
  limit: number;
  branchId?: string;
  includeCancelled?: true;
} | null => {
  const result = administratorSessionQuerySchema.safeParse(value);
  if (!result.success) return null;
  return {
    from: new Date(result.data.from),
    until: new Date(result.data.until),
    limit: result.data.limit,
    ...(result.data.branchId === undefined
      ? {}
      : { branchId: result.data.branchId }),
    ...(result.data.includeCancelled === 'true'
      ? { includeCancelled: true as const }
      : {}),
  };
};

// FIX-042: an optional `true`/`false` query flag; anything else is invalid.
export const parseOptionalFlag = (value: unknown): boolean | null =>
  value === undefined || value === 'false'
    ? false
    : value === 'true'
      ? true
      : null;

export const parseUuid = (value: unknown): string | null => {
  const result = uuidSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const parseCalendarDate = (value: unknown): Date | null => {
  const result = calendarDateSchema.safeParse(value);
  return result.success ? new Date(`${result.data}T00:00:00.000Z`) : null;
};
