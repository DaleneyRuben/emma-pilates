import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import {
  InvoiceDataDto,
  InvoiceIssuedMarkDto,
} from '../invoice-data/invoice-data.dto';
import { invoiceFileNameMaxLength } from './invoice-file';

const invoiceMediaTypes = ['application/pdf', 'image/jpeg', 'image/png'];

export class InvoiceFileDto {
  @ApiProperty({ maxLength: invoiceFileNameMaxLength })
  fileName!: string;

  @ApiProperty({ enum: invoiceMediaTypes })
  mediaType!: 'application/pdf' | 'image/jpeg' | 'image/png';

  @ApiProperty({ minimum: 1 })
  byteSize!: number;

  @ApiProperty({ format: 'date-time' })
  uploadedAt!: Date;
}

export class StaffInvoiceFileDto extends InvoiceFileDto {
  @ApiProperty({ description: 'The Staff Member who uploaded it' })
  uploadedByName!: string;
}

export class StaffInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({ description: 'What she bought: the Plan or the Evaluation' })
  purchaseLabel!: string;

  @ApiProperty()
  amountDueCentavos!: number;

  @ApiProperty({ enum: ['transfer', 'cash', 'credit_only', 'courtesy'] })
  method!: 'transfer' | 'cash' | 'credit_only' | 'courtesy';

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  confirmedAt!: Date | null;

  @ApiProperty({ description: 'A voided sale takes no new invoice' })
  voided!: boolean;

  @ApiProperty({
    type: InvoiceDataDto,
    nullable: true,
    description: 'null is «Sin factura»: no invoice can be uploaded',
  })
  invoiceData!: InvoiceDataDto | null;

  @ApiProperty({
    type: InvoiceIssuedMarkDto,
    nullable: true,
    description:
      '«Factura emitida»; set with no file only by the mark used before FIX-044',
  })
  invoiceIssued!: InvoiceIssuedMarkDto | null;

  @ApiProperty({ type: StaffInvoiceFileDto, nullable: true })
  file!: StaffInvoiceFileDto | null;
}

export class StaffInvoiceListDto {
  @ApiProperty({ type: StaffInvoiceDto, isArray: true })
  items!: StaffInvoiceDto[];
}

export class AttachInvoiceDto {
  @ApiProperty({
    format: 'uuid',
    description: 'A ready upload with the `invoice` purpose',
  })
  imageAssetId!: string;

  @ApiProperty({
    required: false,
    description: 'The name the file had on the device; shown to the Client',
  })
  fileName?: string;
}

export class ClientInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty()
  purchaseLabel!: string;

  @ApiProperty()
  amountDueCentavos!: number;

  @ApiProperty({ format: 'date-time' })
  paidAt!: Date;

  @ApiProperty({
    enum: ['ready', 'preparing'],
    description: '«Lista» or «En preparación»',
  })
  state!: 'ready' | 'preparing';

  @ApiProperty({ description: '«Pago anulado»: the invoice stays visible' })
  voided!: boolean;

  @ApiProperty({ type: InvoiceDataDto })
  invoiceData!: InvoiceDataDto;

  @ApiProperty({ type: InvoiceFileDto, nullable: true })
  file!: InvoiceFileDto | null;
}

export class ClientInvoiceListDto {
  @ApiProperty({ type: ClientInvoiceDto, isArray: true })
  items!: ClientInvoiceDto[];
}

export const staffInvoiceFilters = ['pending', 'uploaded'] as const;

export const attachInvoiceSchema = z.object({
  imageAssetId: z.uuid(),
  fileName: z.string().max(1_000).optional(),
});
