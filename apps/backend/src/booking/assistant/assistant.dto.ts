import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { ClassHistoryEntryDto } from '../booking.dto';
import { UpcomingBookingDto } from '../client/client-bookings.controller';
import {
  ClientSubscriptionDto,
  ClientSubscriptionSummaryDto,
  PlanDto,
} from '../client/client-discovery.dto';
import { PaymentDto } from '../payments/payments.dto';
import type { ClientAccountStatus } from './assistant-clients';

const uuid = z.uuid();

export const clientAccountStatuses = [
  'active',
  'pending',
  'disabled',
] as const satisfies readonly ClientAccountStatus[];

const searchQuerySchema = z.string().trim().min(2).max(100);

export const parseSearchQuery = (value: unknown): string | null => {
  const result = searchQuerySchema.safeParse(value);
  return result.success ? result.data : null;
};

export class AssistantClientDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: clientAccountStatuses })
  accountStatus!: ClientAccountStatus;
}

export class AssistantClientBookingDto extends UpcomingBookingDto {
  @ApiProperty({
    description:
      'Whether the signed-in Staff Member may cancel, reschedule, or leave this item',
  })
  actionable!: boolean;
}

export class ClientOverviewDto {
  @ApiProperty({ type: AssistantClientDto })
  client!: AssistantClientDto;

  @ApiProperty({ type: ClientSubscriptionDto })
  subscription!: ClientSubscriptionDto;

  @ApiPropertyOptional({ type: UpcomingBookingDto, nullable: true })
  nextBooking!: UpcomingBookingDto | null;

  @ApiProperty({ type: ClassHistoryEntryDto, isArray: true })
  recentHistory!: ClassHistoryEntryDto[];

  @ApiProperty({ minimum: 0, description: 'Available Credit in BOB centavos' })
  creditAvailableCentavos!: number;
}

export class PlanQuoteDto extends PlanDto {
  @ApiProperty({ minimum: 0, description: 'Credit this purchase would spend' })
  creditAppliedCentavos!: number;

  @ApiProperty({ minimum: 0, description: 'Cash to collect in BOB centavos' })
  amountDueCentavos!: number;
}

export class PlanQuotesDto {
  @ApiProperty({ minimum: 0 })
  creditAvailableCentavos!: number;

  @ApiProperty({ type: PlanQuoteDto, isArray: true })
  plans!: PlanQuoteDto[];
}

export class RecordCashPaymentDto {
  @ApiProperty({ format: 'uuid' })
  planId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Branch where the cash was collected',
  })
  branchId!: string;
}

export const parseRecordCashPayment = (
  value: unknown,
): RecordCashPaymentDto | null => {
  const result = z
    .strictObject({ planId: uuid, branchId: uuid })
    .safeParse(value);
  return result.success ? result.data : null;
};

export class AssistantCashPaymentDto {
  @ApiProperty({ type: PaymentDto })
  payment!: PaymentDto;

  @ApiPropertyOptional({ type: ClientSubscriptionSummaryDto, nullable: true })
  subscription!: ClientSubscriptionSummaryDto | null;
}
