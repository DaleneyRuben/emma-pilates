import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class AdminPromotionContactDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({
    format: 'date-time',
    description: 'When the former Client ticked the promotions box',
  })
  consentedAt!: string;
}

export class AdminPromotionContactPageDto {
  @ApiProperty({ type: AdminPromotionContactDto, isArray: true })
  items!: AdminPromotionContactDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0, description: 'Contacts matching the search' })
  totalItems!: number;
}

export class AdminPromotionContactExportDto {
  @ApiProperty({
    type: AdminPromotionContactDto,
    isArray: true,
    description: 'Every contact not withdrawn, newest consent first',
  })
  items!: AdminPromotionContactDto[];
}

// Search is the list's only filter; unknown parameters are refused
// (ADR-0062).
export const parsePromotionContactQuery = (value: unknown) =>
  z
    .strictObject({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(100).optional(),
    })
    .transform(({ q, ...paging }) =>
      q === undefined || q === '' ? paging : { ...paging, query: q },
    )
    .safeParse(value);
