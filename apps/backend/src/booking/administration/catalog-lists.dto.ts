import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import {
  AdminBranchDto,
  AdminClassTypeDto,
  AdminPlanDto,
} from './administration.dto';

export const catalogStatuses = ['active', 'archived', 'all'] as const;
export const planVisibilities = ['visible', 'hidden', 'all'] as const;

class CatalogPageDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
}

export class AdminBranchPageDto extends CatalogPageDto {
  @ApiProperty({ type: AdminBranchDto, isArray: true })
  items!: AdminBranchDto[];
}

export class AdminClassTypePageDto extends CatalogPageDto {
  @ApiProperty({ type: AdminClassTypeDto, isArray: true })
  items!: AdminClassTypeDto[];
}

export class AdminPlanPageDto extends CatalogPageDto {
  @ApiProperty({ type: AdminPlanDto, isArray: true })
  items!: AdminPlanDto[];
}

const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

// Unknown parameters and values are refused, never ignored (ADR-0062).
export const parseCatalogStatusQuery = (value: unknown) =>
  z
    .strictObject({
      status: z.enum(catalogStatuses).default('active'),
      ...paging,
    })
    .safeParse(value);

export const parsePlanListQuery = (value: unknown) =>
  z
    .strictObject({
      visibility: z.enum(planVisibilities).default('all'),
      ...paging,
    })
    .safeParse(value);
