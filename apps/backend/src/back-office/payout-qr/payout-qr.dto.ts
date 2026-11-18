import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import type { PayoutQr } from './payout-qrs';

export const payoutQrStandings = ['valid', 'expiring', 'expired'] as const;

export class PayoutQrDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date', description: 'The last day the QR pays' })
  validUntil!: string;
  @ApiProperty({ enum: payoutQrStandings }) standing!: PayoutQr['standing'];
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Null for the Administrator once the QR has expired',
  })
  imageUrl!: string | null;
}

export class PayoutQrResultDto {
  @ApiProperty({ type: PayoutQrDto, nullable: true })
  payoutQr!: PayoutQrDto | null;
}

export class SetPayoutQrDto {
  @ApiProperty({ format: 'uuid' }) imageAssetId!: string;
  @ApiProperty({ format: 'date', description: 'The last day the QR pays' })
  validUntil!: string;
}

export const parseSetPayoutQr = (value: unknown) =>
  z
    .strictObject({
      imageAssetId: z.uuid(),
      validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse(value);

export const toPayoutQrDto = (
  qr: PayoutQr | null,
  imageUrl: (qr: PayoutQr) => string | null,
): PayoutQrResultDto => ({
  payoutQr:
    qr === null
      ? null
      : {
          id: qr.id,
          validUntil: qr.validUntil.toISOString().slice(0, 10),
          standing: qr.standing,
          imageUrl: imageUrl(qr),
        },
});
