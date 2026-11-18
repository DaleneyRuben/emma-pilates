import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { equipmentKinds } from './equipment-kind';
import { equipmentTrackings } from './equipment-types';

const uuid = z.uuid();
const name = z.string().trim().min(1).max(40);
const stockQuantity = z.int().min(0).max(9_999);

// FIX-067: a studio-wide Equipment Type.
export class EquipmentTypeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ maxLength: 40 }) name!: string;
  @ApiProperty({
    enum: equipmentTrackings,
    description: 'unit: numbered units; quantity: a count per Branch',
  })
  tracking!: (typeof equipmentTrackings)[number];
  @ApiProperty({
    enum: equipmentKinds,
    nullable: true,
    description: 'Set on the three seeded types only',
  })
  legacyKind!: (typeof equipmentKinds)[number] | null;
}

export class EquipmentTypeListDto {
  @ApiProperty({ type: EquipmentTypeDto, isArray: true })
  items!: EquipmentTypeDto[];
}

export class EquipmentTypeInputDto {
  @ApiProperty({ minLength: 1, maxLength: 40 }) name!: string;
  @ApiProperty({ enum: equipmentTrackings })
  tracking!: (typeof equipmentTrackings)[number];
  @ApiProperty({
    format: 'uuid',
    required: false,
    description: 'With quantity, on a quantity type: that Branch’s count',
  })
  branchId?: string;
  @ApiProperty({ minimum: 0, maximum: 9999, required: false })
  quantity?: number;
}

export class EquipmentTypeRenameDto {
  @ApiProperty({ minLength: 1, maxLength: 40 }) name!: string;
}

export class EquipmentStockDto {
  @ApiProperty({ format: 'uuid' }) typeId!: string;
  @ApiProperty() typeName!: string;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ minimum: 0, maximum: 9999 }) quantity!: number;
  @ApiProperty({ description: 'The open damage, summed' }) damaged!: number;
  @ApiProperty({ description: 'quantity less damaged' }) usable!: number;
}

export class EquipmentStockListDto {
  @ApiProperty({ type: EquipmentStockDto, isArray: true })
  items!: EquipmentStockDto[];
}

export class EquipmentStockInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) typeId!: string;
  @ApiProperty({ minimum: 0, maximum: 9999 }) quantity!: number;
}

export class EquipmentDamageInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) typeId!: string;
  @ApiProperty({ minimum: 1, maximum: 9999 }) quantity!: number;
  @ApiProperty({ maxLength: 500 }) description!: string;
}

export const parseTypeInput = (value: unknown) =>
  z
    .strictObject({
      name,
      tracking: z.enum(equipmentTrackings),
      branchId: uuid.optional(),
      quantity: stockQuantity.optional(),
    })
    .refine(
      ({ tracking, branchId, quantity }) =>
        (branchId === undefined) === (quantity === undefined) &&
        (quantity === undefined || tracking === 'quantity'),
    )
    .safeParse(value);

export const parseTypeRename = (value: unknown) =>
  z.strictObject({ name }).safeParse(value);

export const parseStockInput = (value: unknown) =>
  z
    .strictObject({ branchId: uuid, typeId: uuid, quantity: stockQuantity })
    .safeParse(value);
