import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { ClientPhotoDto } from '../client/client-discovery.dto';

// A shape match is not a calendar date: 2026-02-31 rolls into March.
export const isCivilDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

const civilDate = z.string().refine(isCivilDate);

const requestFreezeSchema = z.strictObject({
  subscriptionId: z.uuid(),
  startsOn: civilDate,
  endsOn: civilDate,
  reason: z.string().trim().min(1).max(300),
});

export class RequestFreezeDto {
  @ApiProperty({ format: 'uuid' })
  subscriptionId!: string;

  @ApiProperty({ format: 'date' })
  startsOn!: string;

  @ApiProperty({ format: 'date' })
  endsOn!: string;

  @ApiProperty({ minLength: 1, maxLength: 300 })
  reason!: string;
}

export const parseRequestFreeze = (value: unknown): RequestFreezeDto | null => {
  const result = requestFreezeSchema.safeParse(value);
  return result.success ? result.data : null;
};

export class FreezeRequestDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['requested'] })
  state!: 'requested';
}

const decideFreezeSchema = z.strictObject({
  decision: z.enum(['approved', 'refused']),
});

export class DecideFreezeDto {
  @ApiProperty({ enum: ['approved', 'refused'] })
  decision!: 'approved' | 'refused';
}

export const parseDecideFreeze = (value: unknown): DecideFreezeDto | null => {
  const result = decideFreezeSchema.safeParse(value);
  return result.success ? result.data : null;
};

export class FreezeDecisionDto {
  @ApiProperty({ enum: ['approved', 'refused'] })
  state!: 'approved' | 'refused';
}

export class FreezeReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({
    type: ClientPhotoDto,
    nullable: true,
    description: 'The Client photo (FIX-041), null while her initials stand in',
  })
  clientPhoto!: ClientPhotoDto | null;

  @ApiProperty()
  planName!: string;

  @ApiProperty({ format: 'date' })
  startsOn!: string;

  @ApiProperty({ format: 'date' })
  endsOn!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: ['requested', 'approved', 'refused'] })
  state!: 'requested' | 'approved' | 'refused';

  @ApiPropertyOptional({
    format: 'date',
    description: "The plan's end before this Freeze (walkthrough finding 52)",
  })
  planEndsOn?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    description:
      "The plan's end once this Freeze is approved; null when it was refused",
  })
  planEndsOnAfter?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  decidedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'The Staff Member who approved or refused it',
  })
  decidedByName?: string | null;
}

export class FreezeSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['requested', 'approved', 'refused'] })
  state!: 'requested' | 'approved' | 'refused';

  @ApiProperty({ format: 'date' })
  startsOn!: string;

  @ApiProperty({ format: 'date' })
  endsOn!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  reason!: string | null;
}
