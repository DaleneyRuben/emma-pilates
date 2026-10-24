import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import {
  invoiceNameMaxLength,
  invoiceTaxIdMaxLength,
  normalizeInvoiceData,
  type InvoiceData,
} from './invoice-data';

export class InvoiceDataDto {
  @ApiProperty({
    description: 'NIT or CI: digits, capital letters, and hyphens',
    minLength: 1,
    maxLength: invoiceTaxIdMaxLength,
  })
  taxId!: string;

  @ApiProperty({
    description: 'Name or business name for the invoice',
    minLength: 1,
    maxLength: invoiceNameMaxLength,
  })
  name!: string;
}

export class LastInvoiceDataDto {
  @ApiProperty({
    type: InvoiceDataDto,
    nullable: true,
    description:
      "The Invoice Data of the Client's latest sale that carried any, to prefill the next one",
  })
  invoiceData!: InvoiceDataDto | null;
}

export class InvoiceIssuedMarkDto {
  @ApiProperty({ format: 'date-time' })
  issuedAt!: Date;

  @ApiProperty({ description: 'The Administrator who marked it' })
  issuedByName!: string;
}

export class InvoiceIssuedDto {
  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ type: InvoiceIssuedMarkDto, nullable: true })
  invoiceIssued!: InvoiceIssuedMarkDto | null;
}

/**
 * A sale's optional Invoice Data: absent or null is «Sin factura»; anything
 * present must hold a valid NIT or CI and a name, normalized here.
 */
export const invoiceDataField = z
  .unknown()
  .optional()
  .transform((value, context): InvoiceData | null => {
    const normalized = normalizeInvoiceData(value);
    if (normalized === 'invalid') {
      context.addIssue({ code: 'custom', message: 'Invalid Invoice Data' });
      return z.NEVER;
    }
    return normalized;
  });
