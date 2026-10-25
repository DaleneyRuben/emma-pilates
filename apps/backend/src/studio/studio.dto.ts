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

export class MonthKpisDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
  @ApiProperty() sessionsHeld!: number;
  @ApiProperty() occupancyPercent!: number;
  @ApiProperty({ description: 'Average bookings at window close, in tenths' })
  averageStudentsTimes10!: number;
  @ApiProperty({ description: 'Average attendance, in tenths' })
  averageAttendanceTimes10!: number;
  @ApiProperty() noShowPercent!: number;
  @ApiProperty() activeClients!: number;
  @ApiProperty() newClients!: number;
  @ApiProperty() renewedClients!: number;
  @ApiProperty() renewalPercent!: number;
  @ApiProperty({ required: false }) cashCentavos?: number;
  @ApiProperty({ required: false }) accruedCentavos?: number;
  @ApiProperty({ required: false }) deferredCentavos?: number;
  @ApiProperty({ required: false }) classesStillOwed?: number;
}

export class RecommendationDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['weak_schedule', 'inactive_client'] }) rule!: string;
  @ApiProperty() subject!: string;
  @ApiProperty({ example: '2026-10-01' }) period!: string;
  @ApiProperty() detail!: string;
  @ApiProperty({ enum: ['new', 'seen', 'dismissed', 'resolved'] })
  state!: string;
}

export class RecommendationListDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
  @ApiProperty({ type: [RecommendationDto] })
  recommendations!: RecommendationDto[];
}

export class RecommendationRecomputeDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
  @ApiProperty() written!: number;
}

export class NarrativeActionDto {
  @ApiProperty() text!: string;
  @ApiProperty() because!: string;
}

export class NarrativeReportDto {
  @ApiProperty({ type: [String] }) paragraphs!: string[];
  @ApiProperty({ type: [NarrativeActionDto] }) actions!: NarrativeActionDto[];
}

export class NarrativeQuestionInputDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
  @ApiProperty({ maxLength: 200 }) question!: string;
}

export class NarrativeQuestionDto {
  @ApiProperty() answer!: string;
  @ApiProperty() refused!: boolean;
}

export class RevenueReportDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
  @ApiProperty({ description: 'Cash collected in the month, BOB centavos' })
  cashCentavos!: number;
  @ApiProperty({
    description: 'Revenue accrued by validity days, BOB centavos',
  })
  accruedCentavos!: number;
  @ApiProperty({
    description: 'Cash not yet accrued through today, BOB centavos',
  })
  deferredCentavos!: number;
  @ApiProperty({
    description: 'Remaining class allowance of Subscriptions covering today',
  })
  classesStillOwed!: number;
}
