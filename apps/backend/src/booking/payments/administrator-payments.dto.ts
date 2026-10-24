import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import {
  InvoiceDataDto,
  InvoiceIssuedMarkDto,
} from './invoice-data/invoice-data.dto';
import type {
  AdministratorPaymentQuery,
  AdministratorPaymentState,
  AdministratorPaymentInvoiceFilter,
  AdministratorPaymentStatusFilter,
} from './administrator-payments';

const paymentStates = [
  'pending',
  'confirmed',
  'rejected',
  'voided',
] as const satisfies readonly AdministratorPaymentState[];
export const paymentStatusFilters = [
  'all',
  ...paymentStates,
] as const satisfies readonly AdministratorPaymentStatusFilter[];
export const paymentInvoiceFilters = [
  'all',
  'unissued',
] as const satisfies readonly AdministratorPaymentInvoiceFilter[];
const paymentMethods = ['transfer', 'cash'] as const;

export class AdminPaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  planName!: string;

  @ApiProperty({ minimum: 1, description: 'Money Amount in BOB centavos' })
  planPriceCentavos!: number;

  @ApiProperty({
    minimum: 0,
    deprecated: true,
    description:
      'Deprecated (PAY-005): Credit was retired; 0 on every Payment made since',
  })
  creditAppliedCentavos!: number;

  @ApiProperty({
    minimum: 1,
    description:
      'What was paid: the Plan price (Credit is retired; always the full price since PAY-005)',
  })
  amountDueCentavos!: number;

  @ApiProperty({ enum: paymentStates })
  state!: AdministratorPaymentState;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  decidedAt!: Date | null;

  @ApiProperty({ description: 'Whether the receipt image is still retained' })
  receiptAvailable!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Why the sale was voided; null unless the state is voided',
  })
  voidReason!: string | null;

  @ApiProperty({ enum: paymentMethods })
  method!: 'transfer' | 'cash';

  @ApiProperty({
    type: InvoiceDataDto,
    nullable: true,
    description: 'NIT or CI and name for the invoice; null is «Sin factura»',
  })
  invoiceData!: InvoiceDataDto | null;

  @ApiProperty({
    type: InvoiceIssuedMarkDto,
    nullable: true,
    description: 'The «Factura emitida» mark: who and when',
  })
  invoiceIssued!: InvoiceIssuedMarkDto | null;
}

export class AdminPaymentPageDto {
  @ApiProperty({ type: AdminPaymentDto, isArray: true })
  items!: AdminPaymentDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0, description: 'Payments matching the filters' })
  totalItems!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Pending transfers in the whole studio, whatever the filters',
  })
  pendingCount!: number;
}

// ADR-0062: the state allowlist and a Client name search, nothing else.
export const parseAdminPaymentQuery = (value: unknown) =>
  z
    .strictObject({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(paymentStatusFilters).default('all'),
      invoice: z.enum(paymentInvoiceFilters).default('all'),
      q: z.string().trim().max(100).optional(),
    })
    .transform(({ q, ...filters }): AdministratorPaymentQuery =>
      q === undefined || q === '' ? filters : { ...filters, query: q },
    )
    .safeParse(value);
