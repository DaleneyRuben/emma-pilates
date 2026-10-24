import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { equipmentKinds } from './equipment-kind';

const uuid = z.uuid();
const instant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));
const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
const description = z.string().trim().min(1).max(500);
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
  @ApiProperty({ enum: equipmentKinds }) kind!: (typeof equipmentKinds)[number];
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

export class EquipmentListDto {
  @ApiProperty({ type: EquipmentDto, isArray: true }) items!: EquipmentDto[];
}

export class EquipmentInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ enum: equipmentKinds }) kind!: (typeof equipmentKinds)[number];
  @ApiProperty({ minimum: 1, maximum: 99 }) number!: number;
}

export class EquipmentIssueDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) equipmentId!: string;
  @ApiProperty({ enum: equipmentKinds })
  equipmentKind!: (typeof equipmentKinds)[number];
  @ApiProperty() equipmentNumber!: number;
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

export class SessionEquipmentIssueInputDto extends EquipmentIssueInputDto {
  @ApiProperty({ format: 'uuid' }) equipmentId!: string;
}

export class EquipmentFlaggedSessionDto {
  @ApiProperty({ format: 'uuid' }) sessionId!: string;
  @ApiProperty({ enum: equipmentKinds }) kind!: (typeof equipmentKinds)[number];
  @ApiProperty() capacity!: number;
  @ApiProperty({ description: 'Working Equipment of the kind at the Branch' })
  workingCount!: number;
}

export class SessionEquipmentDto {
  @ApiProperty({ format: 'uuid' }) sessionId!: string;
  @ApiProperty({
    enum: equipmentKinds,
    nullable: true,
    description: 'The kind its Class Type uses; null when it uses none',
  })
  kind!: (typeof equipmentKinds)[number] | null;
  @ApiProperty({ type: EquipmentDto, isArray: true }) items!: EquipmentDto[];
}

export const parseEquipmentQuery = (value: unknown) =>
  z.strictObject({ branchId: uuid }).safeParse(value);

export const parseEquipmentInput = (value: unknown) =>
  z
    .strictObject({
      branchId: uuid,
      kind: z.enum(equipmentKinds),
      number: z.int().min(1).max(99),
    })
    .safeParse(value);

export const parseIssueInput = (value: unknown) =>
  z.strictObject({ description, outOfService: z.boolean() }).safeParse(value);

export const parseSessionIssueInput = (value: unknown) =>
  z
    .strictObject({ equipmentId: uuid, description, outOfService: z.boolean() })
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
