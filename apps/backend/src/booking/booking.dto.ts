import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class CreateBookingDto {
  @ApiPropertyOptional({ format: 'uuid' })
  clientId?: string;
}

export class CreatedBookingDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
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

export class SessionAvailabilityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty({ format: 'uuid' })
  classTypeId!: string;

  @ApiProperty({ format: 'uuid' })
  trainerStaffMemberId!: string;

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
): { branchId: string; from: Date; until: Date; limit: number } | null => {
  const result = availabilityQuerySchema.safeParse(value);
  if (!result.success) return null;

  return {
    branchId: result.data.branchId,
    from: new Date(result.data.from),
    until: new Date(result.data.until),
    limit: result.data.limit,
  };
};

export const parseUuid = (value: unknown): string | null => {
  const result = uuidSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const parseCalendarDate = (value: unknown): Date | null => {
  const result = calendarDateSchema.safeParse(value);
  return result.success ? new Date(`${result.data}T00:00:00.000Z`) : null;
};
