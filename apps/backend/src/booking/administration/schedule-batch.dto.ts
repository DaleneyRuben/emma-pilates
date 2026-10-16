import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import {
  SessionScheduleCreationDto,
  sessionMinutes,
} from './administration.dto';

export class SessionScheduleRowDto {
  @ApiProperty({
    minimum: 1,
    maximum: 7,
    description: 'ISO weekday, Monday = 1',
  })
  weekday!: number;
  @ApiProperty({ example: '07:00', description: 'Bolivia wall clock' })
  startsAtLocal!: string;
  @ApiProperty({ minimum: 5, maximum: 240 }) durationMinutes!: number;
}

export class SessionScheduleBatchInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) classTypeId!: string;
  @ApiProperty({ format: 'uuid' }) trainerStaffMemberId!: string;
  @ApiProperty({ minimum: 1 }) capacity!: number;
  @ApiProperty({ format: 'date', description: 'Vigente desde, today or later' })
  effectiveFrom!: string;
  @ApiProperty({
    type: SessionScheduleRowDto,
    isArray: true,
    minItems: 1,
    maxItems: 7,
    description:
      'One weekly schedule per row, each lasting its own minutes, all created together or none; rows may not repeat or overlap each other',
  })
  rows!: SessionScheduleRowDto[];
}

export class SessionScheduleBatchDto {
  @ApiProperty({ type: SessionScheduleCreationDto, isArray: true })
  schedules!: SessionScheduleCreationDto[];
}

export const parseScheduleBatchInput = (value: unknown) =>
  z
    .strictObject({
      branchId: z.uuid(),
      classTypeId: z.uuid(),
      trainerStaffMemberId: z.uuid(),
      capacity: z.int().min(1).max(100),
      effectiveFrom: z.iso.date(),
      rows: z
        .array(
          z.strictObject({
            weekday: z.int().min(1).max(7),
            startsAtLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            durationMinutes: sessionMinutes,
          }),
        )
        .min(1)
        .max(7),
    })
    .transform((input) => ({
      ...input,
      effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
    }))
    .safeParse(value);
