import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { AdminSessionScheduleDto } from './administration.dto';

const civilDate = z.iso.date();
const toCivilDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export class SessionSchedulePauseInputDto {
  @ApiProperty({
    format: 'date',
    description:
      'Pausar desde: the first date without Sessions, today or later',
  })
  pausedFrom!: string;
  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    required: false,
    description:
      'Vuelve el: the first date with Sessions again, after pausedFrom; left out or null to pause until resumed',
  })
  pausedUntil?: string | null;
}

export class SessionSchedulePauseDto {
  @ApiProperty({ type: AdminSessionScheduleDto })
  schedule!: AdminSessionScheduleDto;
  @ApiProperty({ description: 'Unbooked Sessions the pause withdrew' })
  cancelledSessions!: number;
  @ApiProperty({
    description: 'Sessions inside the pause kept for their Bookings',
  })
  keptSessions!: number;
}

export class SessionScheduleResumeDto {
  @ApiProperty({ type: AdminSessionScheduleDto })
  schedule!: AdminSessionScheduleDto;
  @ApiProperty({ description: 'Sessions the pause withdrew, published again' })
  restoredSessions!: number;
  @ApiProperty({ description: 'Sessions created for dates never published' })
  created!: number;
}

export const parseSchedulePause = (value: unknown) =>
  z
    .strictObject({
      pausedFrom: civilDate,
      pausedUntil: civilDate.nullable().optional(),
    })
    .transform((input) => ({
      pausedFrom: toCivilDate(input.pausedFrom),
      pausedUntil:
        input.pausedUntil === undefined || input.pausedUntil === null
          ? null
          : toCivilDate(input.pausedUntil),
    }))
    .safeParse(value);
