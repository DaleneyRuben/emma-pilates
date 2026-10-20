import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class PromotionsConsentDto {
  @ApiProperty({ description: 'Whether the Client agrees to promotions now' })
  consented!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the open consent was given, or null',
  })
  consentedAt!: string | null;
}

export class SetPromotionsConsentDto {
  @ApiProperty()
  consented!: boolean;
}

export const parseSetPromotionsConsent = (
  value: unknown,
): SetPromotionsConsentDto | null => {
  const result = z.strictObject({ consented: z.boolean() }).safeParse(value);
  return result.success ? result.data : null;
};
