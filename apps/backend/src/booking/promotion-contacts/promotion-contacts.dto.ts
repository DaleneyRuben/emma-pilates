import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class AdminPromotionContactDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The Promotion Contact, or the live Client',
  })
  id!: string;

  @ApiProperty({
    enum: ['client', 'former_client'],
    description:
      'A live Client (listed whether or not she agreed to promotions), or a former Client who ticked the box when closing',
  })
  kind!: 'client' | 'former_client';

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({
    format: 'date-time',
    description:
      'When a live Client joined, or when a former Client agreed while closing her Account',
  })
  since!: string;

  @ApiProperty({
    format: 'date-time',
    deprecated: true,
    description:
      'The same instant as since, kept for admin web builds before FIX-060',
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
    description: 'Every contact not withdrawn, newest first',
  })
  items!: AdminPromotionContactDto[];
}

export const promotionContactKinds = ['client', 'former_client'] as const;

const filters = {
  q: z.string().trim().max(100).optional(),
  // FIX-065 (walkthrough finding 91): Clientas › Cuenta cerrada.
  kind: z.enum(promotionContactKinds).optional(),
};

const withFilters = <
  T extends { q?: string; kind?: (typeof promotionContactKinds)[number] },
>({
  q,
  kind,
  ...rest
}: T) => ({
  ...rest,
  ...(kind === undefined ? {} : { kind }),
  ...(q === undefined || q === '' ? {} : { query: q }),
});

// Search and the kind are the list's only filters; unknown parameters are
// refused (ADR-0062).
export const parsePromotionContactQuery = (value: unknown) =>
  z
    .strictObject({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      ...filters,
    })
    .transform(withFilters)
    .safeParse(value);

// The export takes the list's filters, never its paging.
export const parsePromotionContactExportQuery = (value: unknown) =>
  z.strictObject(filters).transform(withFilters).safeParse(value);
