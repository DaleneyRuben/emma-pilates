import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const parseStudioRecompute = (value: unknown) =>
  z.object({ month }).safeParse(value);

export class StudioRecomputeInputDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
}

export class StudioRecomputeDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
  @ApiProperty() sessions!: number;
  @ApiProperty() clientMonths!: number;
}
