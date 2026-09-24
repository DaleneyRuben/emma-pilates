import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const uuid = z.uuid();

// ADM-001 slices D and E: the oversight lists and the income report.
const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export const parseEvaluationListQuery = (value: unknown) =>
  z
    .strictObject({
      from: z.iso.datetime(),
      until: z.iso.datetime(),
      nutritionistStaffMemberId: uuid.optional(),
      ...paging,
    })
    .refine(({ from, until }) => new Date(from) < new Date(until))
    .transform(({ from, until, ...input }) => ({
      ...input,
      from: new Date(from),
      until: new Date(until),
    }))
    .safeParse(value);

export const parseSearchListQuery = (value: unknown) =>
  z
    .strictObject({
      query: z.string().trim().min(1).max(80).optional(),
      ...paging,
    })
    .safeParse(value);

export const parseIncomeQuery = (value: unknown) =>
  z
    .strictObject({
      from: z.iso.datetime(),
      until: z.iso.datetime(),
      branchId: uuid.optional(),
    })
    .refine(({ from, until }) => new Date(from) < new Date(until))
    .transform(({ from, until, ...input }) => ({
      ...input,
      from: new Date(from),
      until: new Date(until),
    }))
    .safeParse(value);

export class AdminEvaluationDto {
  @ApiProperty({ format: 'uuid' }) evaluationId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty({ format: 'uuid' }) nutritionistStaffMemberId!: string;
  @ApiProperty() nutritionistName!: string;
  @ApiProperty() branchName!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ format: 'date-time' }) endsAt!: Date;
}

export class AdminEvaluationPageDto {
  @ApiProperty({ type: AdminEvaluationDto, isArray: true })
  items!: AdminEvaluationDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
}

export class AdminReferralDto {
  @ApiProperty({ format: 'uuid' }) referralId!: string;
  @ApiProperty() referrerName!: string;
  @ApiProperty() referredName!: string;
  @ApiProperty({ format: 'date-time' }) registeredAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  awardedAt!: Date | null;
  @ApiProperty({ enum: ['pending', 'awarded'] }) state!: 'pending' | 'awarded';
}

export class AdminReferralPageDto {
  @ApiProperty({ type: AdminReferralDto, isArray: true })
  items!: AdminReferralDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
}

export class AdminCreditBalanceDto {
  @ApiProperty({ format: 'uuid' }) clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty({ description: 'BOB centavos' }) availableCentavos!: number;
  @ApiProperty({ format: 'date-time' }) lastMovementAt!: Date;
}

export class AdminCreditPageDto {
  @ApiProperty({ type: AdminCreditBalanceDto, isArray: true })
  items!: AdminCreditBalanceDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
  @ApiProperty({ description: 'Studio-wide available Credit, BOB centavos' })
  outstandingCentavos!: number;
}

export class IncomeByMethodDto {
  @ApiProperty() cash!: number;
  @ApiProperty() transfer!: number;
  @ApiProperty() credit_only!: number;
}

export class IncomeMonthDto {
  @ApiProperty({
    format: 'date',
    description: 'First day of the Bolivia month',
  })
  month!: string;
  @ApiProperty() totalCentavos!: number;
}

export class IncomeReportDto {
  @ApiProperty({ format: 'date-time' }) from!: Date;
  @ApiProperty({ format: 'date-time' }) until!: Date;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) branchId!:
    string | null;
  @ApiProperty({ description: 'Confirmed Payments, BOB centavos' })
  totalCentavos!: number;
  @ApiProperty({ type: IncomeByMethodDto }) byMethod!: IncomeByMethodDto;
  @ApiProperty({ type: IncomeMonthDto, isArray: true })
  months!: IncomeMonthDto[];
  @ApiProperty({ format: 'date-time' }) generatedAt!: Date;
}
