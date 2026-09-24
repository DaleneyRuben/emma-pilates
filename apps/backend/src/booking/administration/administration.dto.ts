import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const uuid = z.uuid();
const civilDate = z.iso.date();
const text = (max: number) => z.string().trim().min(1).max(max);

// ---------- Catalog ----------

export class AdminBranchDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() address!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt!: Date | null;
}

export class BranchInputDto {
  @ApiProperty({ maxLength: 80 }) name!: string;
  @ApiProperty({ maxLength: 160 }) address!: string;
}

export class AdminClassTypeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty() defaultCapacity!: number;
  @ApiProperty({ type: String, nullable: true }) equipmentNeeds!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt!: Date | null;
}

export class ClassTypeInputDto {
  @ApiProperty({ maxLength: 80 }) name!: string;
  @ApiProperty({ maxLength: 280 }) description!: string;
  @ApiProperty({ minimum: 5, maximum: 240 }) durationMinutes!: number;
  @ApiProperty({ minimum: 1, maximum: 100 }) defaultCapacity!: number;
  @ApiProperty({ type: String, nullable: true, required: false })
  equipmentNeeds?: string | null;
}

export class AdminPlanDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: [1, 3, 6, 12] }) durationMonths!: number;
  @ApiProperty() classAllowance!: number;
  @ApiProperty({ description: 'BOB centavos' }) priceCentavos!: number;
  @ApiProperty() displayOrder!: number;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  hiddenAt!: Date | null;
}

export class PlanInputDto {
  @ApiProperty({ maxLength: 80 }) name!: string;
  @ApiProperty({ enum: [1, 3, 6, 12] }) durationMonths!: number;
  @ApiProperty({ minimum: 1 }) classAllowance!: number;
  @ApiProperty({ minimum: 1, description: 'BOB centavos' })
  priceCentavos!: number;
  @ApiProperty({ minimum: 0 }) displayOrder!: number;
}

export class PlanVisibilityDto {
  @ApiProperty() visible!: boolean;
}

export const parseBranchInput = (value: unknown) =>
  z.strictObject({ name: text(80), address: text(160) }).safeParse(value);

export const parseClassTypeInput = (value: unknown) =>
  z
    .strictObject({
      name: text(80),
      description: text(280),
      durationMinutes: z.int().min(5).max(240),
      defaultCapacity: z.int().min(1).max(100),
      equipmentNeeds: z.string().trim().max(160).nullable().optional(),
    })
    .transform((input) => ({
      ...input,
      equipmentNeeds: input.equipmentNeeds ?? null,
    }))
    .safeParse(value);

export const parsePlanInput = (value: unknown) =>
  z
    .strictObject({
      name: text(80),
      durationMonths: z.union([
        z.literal(1),
        z.literal(3),
        z.literal(6),
        z.literal(12),
      ]),
      classAllowance: z.int().min(1).max(1000),
      priceCentavos: z.int().min(1),
      displayOrder: z.int().min(0),
    })
    .safeParse(value);

export const parsePlanVisibility = (value: unknown) =>
  z.strictObject({ visible: z.boolean() }).safeParse(value);

// ---------- Schedules and Sessions ----------

export class AdminSessionScheduleDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) classTypeId!: string;
  @ApiProperty({ format: 'uuid' }) trainerStaffMemberId!: string;
  @ApiProperty({
    minimum: 1,
    maximum: 7,
    description: 'ISO weekday, Monday = 1',
  })
  weekday!: number;
  @ApiProperty({ example: '09:00', description: 'Bolivia wall clock' })
  startsAtLocal!: string;
  @ApiProperty() capacity!: number;
  @ApiProperty({ format: 'date' }) effectiveFrom!: string;
  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'Exclusive end',
  })
  effectiveUntil!: string | null;
  @ApiProperty() classTypeName!: string;
  @ApiProperty() durationMinutes!: number;
}

export class SessionScheduleInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) classTypeId!: string;
  @ApiProperty({ format: 'uuid' }) trainerStaffMemberId!: string;
  @ApiProperty({ minimum: 1, maximum: 7 }) weekday!: number;
  @ApiProperty({ example: '09:00' }) startsAtLocal!: string;
  @ApiProperty({ minimum: 1 }) capacity!: number;
  @ApiProperty({ format: 'date', description: 'Vigente desde, today or later' })
  effectiveFrom!: string;
}

export class SessionScheduleEndInputDto {
  @ApiProperty({ format: 'date' }) effectiveFrom!: string;
}

export class SessionScheduleCreationDto {
  @ApiProperty({ type: AdminSessionScheduleDto })
  schedule!: AdminSessionScheduleDto;
  @ApiProperty() created!: number;
  @ApiProperty({
    description: 'Occurrences skipped for overlapping a scheduled Session',
  })
  skipped!: number;
}

export class SessionScheduleReplacementDto {
  @ApiProperty({ type: AdminSessionScheduleDto })
  ended!: AdminSessionScheduleDto;
  @ApiProperty({ type: AdminSessionScheduleDto })
  replacement!: AdminSessionScheduleDto;
  @ApiProperty() cancelledSessions!: number;
  @ApiProperty({ description: 'Booked or exception Sessions left unchanged' })
  keptSessions!: number;
  @ApiProperty() created!: number;
  @ApiProperty() skipped!: number;
}

export class SessionScheduleEndDto {
  @ApiProperty({ type: AdminSessionScheduleDto })
  schedule!: AdminSessionScheduleDto;
  @ApiProperty() cancelledSessions!: number;
  @ApiProperty() keptSessions!: number;
}

export class AdminSessionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sessionScheduleId!: string | null;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) classTypeId!: string;
  @ApiProperty({ format: 'uuid' }) trainerStaffMemberId!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ format: 'date-time' }) endsAt!: Date;
  @ApiProperty() capacity!: number;
  @ApiProperty({ enum: ['scheduled', 'cancelled'] }) state!:
    'scheduled' | 'cancelled';
  @ApiProperty() isException!: boolean;
}

export class SessionInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) classTypeId!: string;
  @ApiProperty({ format: 'uuid' }) trainerStaffMemberId!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({
    required: false,
    description: 'Defaults to the Class Type capacity',
  })
  capacity?: number;
}

export class SessionChangeDto {
  @ApiProperty({ format: 'uuid', required: false })
  trainerStaffMemberId?: string;
  @ApiProperty({ format: 'date-time', required: false }) startsAt?: string;
  @ApiProperty({ required: false }) capacity?: number;
}

const toCivilDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

const scheduleFields = {
  branchId: uuid,
  classTypeId: uuid,
  trainerStaffMemberId: uuid,
  weekday: z.int().min(1).max(7),
  startsAtLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  capacity: z.int().min(1).max(100),
};

export const parseScheduleInput = (value: unknown) =>
  z
    .strictObject({ ...scheduleFields, effectiveFrom: civilDate })
    .transform((input) => ({
      ...input,
      effectiveFrom: toCivilDate(input.effectiveFrom),
    }))
    .safeParse(value);

export const parseScheduleEnd = (value: unknown) =>
  z
    .strictObject({ effectiveFrom: civilDate })
    .transform((input) => ({ effectiveFrom: toCivilDate(input.effectiveFrom) }))
    .safeParse(value);

export const parseSessionInput = (value: unknown) =>
  z
    .strictObject({
      branchId: uuid,
      classTypeId: uuid,
      trainerStaffMemberId: uuid,
      startsAt: z.iso.datetime(),
      capacity: z.int().min(1).max(100).optional(),
    })
    .transform(({ startsAt, ...input }) => ({
      ...input,
      startsAt: new Date(startsAt),
    }))
    .safeParse(value);

export const parseSessionChange = (value: unknown) =>
  z
    .strictObject({
      trainerStaffMemberId: uuid.optional(),
      startsAt: z.iso.datetime().optional(),
      capacity: z.int().min(1).max(100).optional(),
    })
    .refine((input) => Object.keys(input).length > 0, 'Nothing to change')
    .transform(({ startsAt, ...input }) => ({
      ...input,
      ...(startsAt === undefined ? {} : { startsAt: new Date(startsAt) }),
    }))
    .safeParse(value);

export const parseScheduleQuery = (value: unknown) =>
  z.strictObject({ branchId: uuid.optional() }).safeParse(value);
