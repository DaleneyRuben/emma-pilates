import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { promotionCopyLimits, promotionStates } from './promotion-rules';

// ---------- Administrator (AW17, AW18) ----------

export class AdminPromotionImageDto {
  @ApiProperty({ format: 'uuid' }) imageAssetId!: string;
  @ApiProperty({ description: 'Source width after finalization' })
  width!: number;
  @ApiProperty() height!: number;
  @ApiProperty({
    description:
      'Authenticated route streaming the private 480 px variant for the list',
  })
  thumbnailUrl!: string;
}

export class AdminPromotionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() headline!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ format: 'date' }) displayStartsOn!: string;
  @ApiProperty({ format: 'date' }) displayEndsOn!: string;
  @ApiProperty() displayOrder!: number;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;
  @ApiProperty({ enum: promotionStates }) state!: string;
  @ApiPropertyOptional({ type: AdminPromotionImageDto, nullable: true })
  image!: AdminPromotionImageDto | null;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PromotionInputDto {
  @ApiProperty({ maxLength: promotionCopyLimits.headline }) headline!: string;
  @ApiProperty({ maxLength: promotionCopyLimits.description })
  description!: string;
  @ApiProperty({ format: 'date' }) displayStartsOn!: string;
  @ApiProperty({ format: 'date' }) displayEndsOn!: string;
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'A finalized `promotion` upload owned by the Administrator',
  })
  imageAssetId?: string | null;
}

export class PromotionOrderDto {
  @ApiProperty({
    type: [String],
    description: 'Every live Promotion, in carousel order',
  })
  promotionIds!: string[];
}

// ---------- Client (02) ----------

export class PromotionImageSourceDto {
  @ApiProperty({ description: 'Public, versioned, immutable image URL' })
  url!: string;
  @ApiProperty() mediaType!: string;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
}

export class PromotionImageDto {
  @ApiProperty({ type: PromotionImageSourceDto, isArray: true })
  sources!: PromotionImageSourceDto[];
}

export class PromotionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() headline!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: PromotionImageDto }) image!: PromotionImageDto;
}

// ---------- Parsers ----------

const civilDate = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const promotionInputSchema = z
  .object({
    headline: z.string().max(promotionCopyLimits.headline),
    description: z.string().max(promotionCopyLimits.description),
    displayStartsOn: civilDate,
    displayEndsOn: civilDate,
    imageAssetId: z.uuid().nullable().optional(),
  })
  .transform((value) => ({
    ...value,
    imageAssetId: value.imageAssetId ?? null,
  }));

export const parsePromotionInput = (value: unknown) =>
  promotionInputSchema.safeParse(value);

export const parsePromotionOrder = (value: unknown) =>
  z.object({ promotionIds: z.array(z.uuid()).max(200) }).safeParse(value);
