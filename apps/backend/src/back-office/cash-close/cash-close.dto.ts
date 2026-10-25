import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import type {
  CashCloseHistory,
  CashCloseView,
  CashToday,
} from './prisma-cash-closes';

export const cashDayStatuses = ['closed', 'missing', 'open'] as const;

export class CashCloseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'date', description: 'Bolivia civil day closed' })
  businessDate!: string;
  @ApiProperty({
    description: 'Confirmed cash Payments at the Branch that day, at the close',
  })
  expectedCentavos!: number;
  @ApiProperty() cashPaymentCount!: number;
  @ApiProperty() countedCentavos!: number;
  @ApiProperty({ description: 'Counted minus expected' })
  differenceCentavos!: number;
  @ApiProperty({ type: String, nullable: true }) note!: string | null;
  @ApiProperty({ format: 'date-time' }) closedAt!: string;
  @ApiProperty() closedByName!: string;
}

export class CashTodayDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'date', description: 'Today in Bolivia' })
  businessDate!: string;
  @ApiProperty({
    description: 'Confirmed cash Payments at the Branch today, so far',
  })
  expectedCentavos!: number;
  @ApiProperty() cashPaymentCount!: number;
  @ApiProperty({ type: CashCloseDto, nullable: true })
  close!: CashCloseDto | null;
}

export class CashCloseInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ minimum: 0, description: 'Cash counted in the drawer' })
  countedCentavos!: number;
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    maxLength: 500,
  })
  note?: string | null;
}

export class CashCloseHistoryEntryDto extends CashCloseDto {
  @ApiProperty({
    description:
      'How the day’s cash sales moved after the close: a sale voided later (−) or recorded later (+)',
  })
  adjustmentCentavos!: number;
}

export class CashDayDto {
  @ApiProperty({ format: 'date' }) businessDate!: string;
  @ApiProperty({
    enum: cashDayStatuses,
    description: 'missing: a past day with cash sales and no close',
  })
  status!: (typeof cashDayStatuses)[number];
  @ApiProperty({ description: 'The day’s confirmed cash Payments now' })
  cashSalesCentavos!: number;
  @ApiProperty() cashPaymentCount!: number;
  @ApiProperty({ type: CashCloseHistoryEntryDto, nullable: true })
  close!: CashCloseHistoryEntryDto | null;
}

export class CashCloseHistoryDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ example: '2026-10', description: 'Bolivia month' })
  month!: string;
  @ApiProperty({ description: 'Past days with cash sales and no close' })
  missingDays!: number;
  @ApiProperty({
    type: CashDayDto,
    isArray: true,
    description: 'Days with cash sales or a close, newest first',
  })
  days!: CashDayDto[];
}

const uuid = z.uuid();

export const parseCashTodayQuery = (value: unknown) =>
  z.object({ branchId: uuid }).safeParse(value);

export const parseCashCloseInput = (value: unknown) =>
  z
    .object({
      branchId: uuid,
      countedCentavos: z.int().min(0).max(100_000_000),
      note: z
        .string()
        .max(500)
        .nullish()
        .transform((note) => note ?? null),
    })
    .safeParse(value);

export const parseCashCloseHistoryQuery = (value: unknown) =>
  z
    .object({
      branchId: uuid,
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    })
    .safeParse(value);

const civil = (date: Date): string => date.toISOString().slice(0, 10);

export const toCashCloseDto = (close: CashCloseView): CashCloseDto => ({
  ...close,
  businessDate: civil(close.businessDate),
  closedAt: close.closedAt.toISOString(),
});

export const toCashTodayDto = (today: CashToday): CashTodayDto => ({
  ...today,
  businessDate: civil(today.businessDate),
  close: today.close === null ? null : toCashCloseDto(today.close),
});

export const toCashCloseHistoryDto = (
  history: CashCloseHistory,
): CashCloseHistoryDto => ({
  ...history,
  days: history.days.map((day) => ({
    ...day,
    businessDate: civil(day.businessDate),
    close:
      day.close === null
        ? null
        : {
            ...toCashCloseDto(day.close),
            adjustmentCentavos: day.close.adjustmentCentavos,
          },
  })),
});
