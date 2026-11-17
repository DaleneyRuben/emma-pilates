import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceDataDto } from './invoice-data/invoice-data.dto';
import { ClientPhotoDto } from '../client/client-discovery.dto';
import { PaymentDto } from './payments.dto';

// S11's queue and S12/AW29's «Revisar pago».
export class PendingPaymentDto {
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

  @ApiProperty({
    description: 'What is sold: the Plan name, or «Evaluación nutricional»',
  })
  planName!: string;

  @ApiPropertyOptional({
    enum: ['plan', 'evaluation'],
    description:
      'Walkthrough n.º 65: a Plan sale or a paid Evaluation. Older builds ignore it.',
  })
  kind?: 'plan' | 'evaluation';

  @ApiPropertyOptional({
    format: 'date-time',
    description:
      'Walkthrough n.º 65: when the paid Evaluation is; absent on a Plan sale.',
  })
  evaluationStartsAt?: Date;

  @ApiProperty({ minimum: 1 })
  amountDueCentavos!: number;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: Date;

  @ApiProperty()
  receiptAvailable!: boolean;
}

export class PaymentReceiptDto {
  @ApiProperty({ format: 'uuid' })
  imageAssetId!: string;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  mediaType!: string;
}

export class PaymentReviewDto extends PaymentDto {
  @ApiProperty()
  clientName!: string;

  @ApiPropertyOptional({
    description:
      'FIX-052: the Payment is for her next Plan, queued after a Plan she still has; startsOn is when it begins. Older builds ignore it.',
  })
  nextPlan?: boolean;

  @ApiPropertyOptional({
    enum: ['plan', 'evaluation'],
    description:
      'FIX-052: what was sold; only a Plan names its start. Older builds ignore it.',
  })
  kind?: 'plan' | 'evaluation';

  @ApiPropertyOptional({
    format: 'date-time',
    description:
      'Walkthrough n.º 65: when the paid Evaluation is; absent on a Plan sale.',
  })
  evaluationStartsAt?: Date;

  @ApiPropertyOptional({
    minimum: 0,
    description:
      'Walkthrough n.º 73: the discount taken off planPriceCentavos, in BOB centavos. Older builds ignore it.',
  })
  discountCentavos?: number;

  @ApiPropertyOptional({
    type: InvoiceDataDto,
    nullable: true,
    description:
      'FIX-044: the NIT or CI and name she asked the invoice for; null is «Sin factura»',
  })
  invoiceData!: InvoiceDataDto | null;

  @ApiProperty({
    type: ClientPhotoDto,
    nullable: true,
    description: 'The Client photo (FIX-041), null while her initials stand in',
  })
  clientPhoto!: ClientPhotoDto | null;

  @ApiPropertyOptional({ type: PaymentReceiptDto, nullable: true })
  receipt!: PaymentReceiptDto | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Authenticated backend route streaming the receipt while it is retained',
  })
  receiptUrl!: string | null;
}
