import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const uuid = z.uuid();

export class CreatePurchaseIntentDto {
  @ApiProperty({ format: 'uuid' })
  planId!: string;
}

export const parseCreatePurchaseIntent = (
  value: unknown,
): CreatePurchaseIntentDto | null => {
  const result = z.strictObject({ planId: uuid }).safeParse(value);
  return result.success ? result.data : null;
};

export class AttachReceiptDto {
  @ApiProperty({ format: 'uuid' })
  imageAssetId!: string;
}

export const parseAttachReceipt = (value: unknown): AttachReceiptDto | null => {
  const result = z.strictObject({ imageAssetId: uuid }).safeParse(value);
  return result.success ? result.data : null;
};

export class PurchaseIntentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  planId!: string;

  @ApiProperty()
  planName!: string;

  @ApiProperty({ enum: [1, 3, 6, 12] })
  durationMonths!: number;

  @ApiProperty({ minimum: 1 })
  classAllowance!: number;

  @ApiProperty({ minimum: 1, description: 'Money Amount in BOB centavos' })
  planPriceCentavos!: number;

  @ApiProperty({ minimum: 0, description: 'Credit held for this purchase' })
  creditReservedCentavos!: number;

  @ApiProperty({ minimum: 0, description: 'Amount to transfer in BOB centavos' })
  amountDueCentavos!: number;

  @ApiProperty({ enum: ['open', 'submitted', 'expired'] })
  state!: 'open' | 'submitted' | 'expired';

  @ApiProperty()
  receiptAttached!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: Date;
}

export class PaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['transfer', 'cash', 'credit_only'] })
  method!: 'transfer' | 'cash' | 'credit_only';

  @ApiProperty({ enum: ['pending', 'confirmed', 'rejected'] })
  state!: 'pending' | 'confirmed' | 'rejected';

  @ApiProperty({ format: 'uuid' })
  planId!: string;

  @ApiProperty()
  planName!: string;

  @ApiProperty({ enum: [1, 3, 6, 12] })
  durationMonths!: number;

  @ApiProperty({ minimum: 1 })
  classAllowance!: number;

  @ApiProperty({ minimum: 1 })
  planPriceCentavos!: number;

  @ApiProperty({ minimum: 0 })
  creditAppliedCentavos!: number;

  @ApiProperty({ minimum: 0 })
  amountDueCentavos!: number;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  decidedAt!: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  rejectionReason!: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  subscriptionId!: string | null;
}

export class CreditActivityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: [
      'referral_award',
      'payment_reservation',
      'payment_spend',
      'payment_release',
    ],
  })
  kind!:
    | 'referral_award'
    | 'payment_reservation'
    | 'payment_spend'
    | 'payment_release';

  @ApiProperty({ minimum: 1 })
  amountCentavos!: number;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: Date;
}

export class CreditDto {
  @ApiProperty({ minimum: 0 })
  availableCentavos!: number;

  @ApiProperty({ minimum: 0, description: 'Credit held for a Payment under review' })
  reservedCentavos!: number;

  @ApiProperty({ type: CreditActivityDto, isArray: true })
  activity!: CreditActivityDto[];
}

export class ReferredClientDto {
  @ApiProperty({ format: 'uuid' })
  referredClientId!: string;

  @ApiProperty({ description: 'First name and surname initial' })
  referredName!: string;

  @ApiProperty({ enum: ['pending', 'awarded'] })
  state!: 'pending' | 'awarded';

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  awardedAt!: Date | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  awardCentavos!: number | null;
}

export class ReferralsDto {
  @ApiProperty()
  referralCode!: string;

  @ApiProperty({ type: ReferredClientDto, isArray: true })
  referrals!: ReferredClientDto[];
}

export class PendingPaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  planName!: string;

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

  @ApiPropertyOptional({ type: PaymentReceiptDto, nullable: true })
  receipt!: PaymentReceiptDto | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Authenticated backend route streaming the receipt while it is retained',
  })
  receiptUrl!: string | null;
}

export class RejectPaymentDto {
  @ApiProperty({ minLength: 1, maxLength: 300 })
  reason!: string;
}

export const parseRejectPayment = (value: unknown): RejectPaymentDto | null => {
  const result = z
    .strictObject({ reason: z.string().trim().min(1).max(300) })
    .safeParse(value);
  return result.success ? result.data : null;
};

export class SessionCancellationDto {
  @ApiProperty({ minimum: 0 })
  affectedBookings!: number;
}

export class TransferInstructionsDto {
  @ApiProperty()
  beneficiaryName!: string;

  @ApiProperty()
  bankName!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty({ description: 'Backend route serving the studio QR image' })
  qrImageUrl!: string;
}
