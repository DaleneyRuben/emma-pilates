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
      branchId: uuid.optional(),
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
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty() branchName!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ format: 'date-time' }) endsAt!: Date;
  @ApiProperty({
    enum: ['first', 'follow_up'],
    description: "Derived from the Client's earlier booked Evaluations",
  })
  kind!: 'first' | 'follow_up';
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
  @ApiProperty({
    description: 'Every Referral of the referrer, searched or not',
  })
  referrerReferralCount!: number;
  @ApiProperty() referredName!: string;
  @ApiProperty({ format: 'date-time' }) registeredAt!: Date;
  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    deprecated: true,
    description: 'Deprecated (PAY-005): no Referral is awarded any more',
  })
  awardedAt!: Date | null;
  @ApiProperty({
    enum: ['pending', 'awarded'],
    deprecated: true,
    description: 'Deprecated (PAY-005): no Referral is awarded any more',
  })
  state!: 'pending' | 'awarded';
}

export class AdminReferralPageDto {
  @ApiProperty({ type: AdminReferralDto, isArray: true })
  items!: AdminReferralDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
  @ApiProperty({
    deprecated: true,
    description:
      "Deprecated (PAY-005): the studio's Referrals awarded before Credit was retired",
  })
  awardedCount!: number;
  @ApiProperty({
    description: "The studio's pending Referrals, whatever the search",
  })
  pendingCount!: number;
}

export class IncomeByMethodDto {
  @ApiProperty() cash!: number;
  @ApiProperty() transfer!: number;
  @ApiProperty({
    deprecated: true,
    description: 'Deprecated (PAY-005): Credit-only Payments carry no money',
  })
  credit_only!: number;
}

export class IncomeMonthDto {
  @ApiProperty({
    format: 'date',
    description: 'First day of the Bolivia month',
  })
  month!: string;
  @ApiProperty() totalCentavos!: number;
}

export class FounderMembershipDto {
  @ApiProperty({ format: 'uuid' }) membershipId!: string;
  @ApiProperty({ minimum: 1, maximum: 40 }) number!: number;
  @ApiProperty() clientName!: string;
  @ApiProperty({ format: 'date-time' }) since!: Date;
  @ApiProperty({ enum: ['active', 'lost'] }) status!: 'active' | 'lost';
}

export class FounderMembershipPageDto {
  @ApiProperty({ type: FounderMembershipDto, isArray: true })
  items!: FounderMembershipDto[];
  @ApiProperty() granted!: number;
  @ApiProperty() places!: number;
}

export class IncomeSaleDto {
  @ApiProperty({ format: 'uuid' }) paymentId!: string;
  @ApiProperty({ description: 'List price, BOB centavos' })
  planPriceCentavos!: number;
  @ApiProperty({ description: 'Discount stored on the Payment, BOB centavos' })
  discountCentavos!: number;
  @ApiProperty({ type: String, nullable: true }) discountReason!: string | null;
  @ApiProperty({ description: 'Amount paid, BOB centavos' })
  amountDueCentavos!: number;
}

export class VoidedIncomeDto {
  @ApiProperty({ format: 'uuid' }) paymentId!: string;
  @ApiProperty({ format: 'uuid' }) clientId!: string;
  @ApiProperty({ description: 'Why the Administrator voided the sale' })
  voidReason!: string;
  @ApiProperty({ description: 'Left out of the totals, BOB centavos' })
  amountDueCentavos!: number;
  @ApiProperty({ format: 'date-time' }) voidedAt!: Date;
}

export class IncomeReportDto {
  @ApiProperty({ format: 'date-time' }) from!: Date;
  @ApiProperty({ format: 'date-time' }) until!: Date;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) branchId!:
    string | null;
  @ApiProperty({ description: 'Confirmed Payments, BOB centavos' })
  totalCentavos!: number;
  @ApiProperty({
    description: 'List price of the confirmed sales, BOB centavos',
  })
  listPriceCentavos!: number;
  @ApiProperty({
    description: 'Discounts on the confirmed sales, BOB centavos',
  })
  discountCentavos!: number;
  @ApiProperty({ type: IncomeByMethodDto }) byMethod!: IncomeByMethodDto;
  @ApiProperty({ type: IncomeMonthDto, isArray: true })
  months!: IncomeMonthDto[];
  @ApiProperty({
    type: IncomeSaleDto,
    isArray: true,
    description: 'Sales that carry a discount, with list price and amount paid',
  })
  sales!: IncomeSaleDto[];
  @ApiProperty({ format: 'date-time' }) generatedAt!: Date;
  @ApiProperty({
    type: VoidedIncomeDto,
    isArray: true,
    description:
      'Voided sales in the window. Visible with their reason, never in the totals.',
  })
  voided!: VoidedIncomeDto[];
}
