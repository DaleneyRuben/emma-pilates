import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { equipmentKinds } from './equipment-kind';
import { equipmentTrackings } from './equipment-types';

const uuid = z.uuid();
const instant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));
const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
const description = z.string().trim().min(1).max(500);
const damagedQuantity = z.int().min(1).max(9_999);
const deprecatedKind =
  'Deprecated (FIX-067): the kind of the three seeded types, null for a studio type; read typeId and typeName';
// The admin web asks for one week at a time; a quarter is plenty.
const maximumFlagRange = 92 * 24 * 60 * 60 * 1_000;

export const equipmentStatuses = [
  'working',
  'faulty',
  'out_of_service',
] as const;
export const equipmentIssueStatuses = ['open', 'resolved'] as const;

export class EquipmentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) typeId!: string;
  @ApiProperty() typeName!: string;
  @ApiProperty({
    enum: equipmentKinds,
    nullable: true,
    deprecated: true,
    description: deprecatedKind,
  })
  kind!: (typeof equipmentKinds)[number] | null;
  @ApiProperty({ minimum: 1, maximum: 99 }) number!: number;
  @ApiProperty({
    enum: equipmentStatuses,
    description:
      'out_of_service with an open Issue that takes it out of service, faulty with only other open Issues',
  })
  status!: (typeof equipmentStatuses)[number];
  @ApiProperty() openIssueCount!: number;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt!: Date | null;
}

// A seeded type's unit, as old Staff app builds read it: kind is never null.
export class SessionEquipmentItemDto extends EquipmentDto {
  @ApiProperty({ enum: equipmentKinds })
  declare kind: (typeof equipmentKinds)[number];
}

export class EquipmentListDto {
  @ApiProperty({ type: EquipmentDto, isArray: true }) items!: EquipmentDto[];
}

export class EquipmentInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({
    format: 'uuid',
    required: false,
    description: 'A unit type; send it or kind, not both',
  })
  typeId?: string;
  @ApiProperty({
    enum: equipmentKinds,
    required: false,
    deprecated: true,
    description: 'Deprecated (FIX-067): one of the seeded types; send typeId',
  })
  kind?: (typeof equipmentKinds)[number];
  @ApiProperty({ minimum: 1, maximum: 99 }) number!: number;
}

// A fault on a numbered unit, or damage to some of a Branch's stock of a
// quantity type (FIX-067): then equipmentId, equipmentKind and
// equipmentNumber are null and quantity is set.
export class EquipmentIssueDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  equipmentId!: string | null;
  @ApiProperty({
    enum: equipmentKinds,
    nullable: true,
    deprecated: true,
    description: deprecatedKind,
  })
  equipmentKind!: (typeof equipmentKinds)[number] | null;
  @ApiProperty({ type: Number, nullable: true })
  equipmentNumber!: number | null;
  @ApiProperty({ format: 'uuid' }) typeId!: string;
  @ApiProperty() typeName!: string;
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'How many are damaged; null for a numbered unit',
  })
  quantity!: number | null;
  @ApiProperty({
    description: 'Resolved by writing the damaged units off the stock',
  })
  writtenOff!: boolean;
  @ApiProperty() description!: string;
  @ApiProperty() outOfService!: boolean;
  @ApiProperty({ format: 'date-time' }) reportedAt!: Date;
  @ApiProperty() reportedByName!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  resolvedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true })
  resolvedByName!: string | null;
}

export class EquipmentIssuePageDto {
  @ApiProperty({ type: EquipmentIssueDto, isArray: true })
  items!: EquipmentIssueDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
}

export class EquipmentIssueInputDto {
  @ApiProperty({ maxLength: 500 }) description!: string;
  @ApiProperty() outOfService!: boolean;
}

// A fault on a unit ({ equipmentId, description, outOfService }) or damage
// on a quantity type ({ typeId, quantity, description }).
export class SessionEquipmentIssueInputDto {
  @ApiProperty({ maxLength: 500 }) description!: string;
  @ApiProperty({ format: 'uuid', required: false }) equipmentId?: string;
  @ApiProperty({ required: false, description: 'With equipmentId' })
  outOfService?: boolean;
  @ApiProperty({
    format: 'uuid',
    required: false,
    description: 'A quantity type, with quantity',
  })
  typeId?: string;
  @ApiProperty({ minimum: 1, maximum: 9999, required: false })
  quantity?: number;
}

export class EquipmentFlaggedSessionDto {
  @ApiProperty({ format: 'uuid' }) sessionId!: string;
  @ApiProperty({ format: 'uuid' }) typeId!: string;
  @ApiProperty() typeName!: string;
  @ApiProperty({
    enum: equipmentKinds,
    nullable: true,
    deprecated: true,
    description: deprecatedKind,
  })
  kind!: (typeof equipmentKinds)[number] | null;
  @ApiProperty() capacity!: number;
  @ApiProperty({ description: 'Working Equipment of the type at the Branch' })
  workingCount!: number;
}

export class SessionEquipmentTypeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: equipmentTrackings })
  tracking!: (typeof equipmentTrackings)[number];
  @ApiProperty({
    type: EquipmentDto,
    isArray: true,
    description: 'The Branch’s units; empty for a quantity type',
  })
  units!: EquipmentDto[];
  @ApiProperty({
    description: 'The Branch’s count less its open damage; 0 for a unit type',
  })
  usable!: number;
  @ApiProperty({ description: 'The Branch’s count; 0 for a unit type' })
  quantity!: number;
}

export class SessionEquipmentDto {
  @ApiProperty({ format: 'uuid' }) sessionId!: string;
  @ApiProperty({
    enum: equipmentKinds,
    nullable: true,
    description: 'The kind its Class Type uses; null when it uses none',
  })
  kind!: (typeof equipmentKinds)[number] | null;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'The unit type its Class Type uses (FIX-067); null when none',
  })
  typeId!: string | null;
  @ApiProperty({
    type: SessionEquipmentItemDto,
    isArray: true,
    description:
      'Units of the three seeded types only, for old builds; read types',
  })
  items!: SessionEquipmentItemDto[];
  @ApiProperty({
    type: SessionEquipmentTypeDto,
    isArray: true,
    description: 'Every type not archived, the Session’s first',
  })
  types!: SessionEquipmentTypeDto[];
}

export const parseEquipmentQuery = (value: unknown) =>
  z.strictObject({ branchId: uuid }).safeParse(value);

const equipmentNumber = z.int().min(1).max(99);

export const parseEquipmentInput = (value: unknown) =>
  z
    .union([
      z.strictObject({ branchId: uuid, typeId: uuid, number: equipmentNumber }),
      z.strictObject({
        branchId: uuid,
        kind: z.enum(equipmentKinds),
        number: equipmentNumber,
      }),
    ])
    .safeParse(value);

export const parseIssueInput = (value: unknown) =>
  z.strictObject({ description, outOfService: z.boolean() }).safeParse(value);

export const parseSessionIssueInput = (value: unknown) =>
  z
    .union([
      z.strictObject({
        equipmentId: uuid,
        description,
        outOfService: z.boolean(),
      }),
      z.strictObject({ typeId: uuid, quantity: damagedQuantity, description }),
    ])
    .safeParse(value);

export const parseDamageInput = (value: unknown) =>
  z
    .strictObject({
      branchId: uuid,
      typeId: uuid,
      quantity: damagedQuantity,
      description,
    })
    .safeParse(value);

export const parseIssueQuery = (value: unknown) =>
  z
    .strictObject({
      branchId: uuid,
      status: z.enum(equipmentIssueStatuses).default('open'),
      ...paging,
    })
    .safeParse(value);

export const parseFlagQuery = (value: unknown) =>
  z
    .strictObject({ branchId: uuid, from: instant, until: instant })
    .refine(
      ({ from, until }) =>
        until > from && until.getTime() - from.getTime() <= maximumFlagRange,
    )
    .safeParse(value);
