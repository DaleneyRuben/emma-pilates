import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const uuid = z.uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const count = (minimum: number) => z.int().min(minimum).max(1_000_000);
const centavos = z.int().min(1).max(2_000_000_000);
// Bolivia civil dates travel as YYYY-MM-DD and become UTC midnight (ADR-0057).
const civilDate = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export const parseUuidValue = (value: unknown): string | null => {
  const result = uuid.safeParse(value);
  return result.success ? result.data : null;
};

// ---------- Supplies ----------

export class AdminSupplyDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Whole units' }) quantityOnHand!: number;
  @ApiProperty() lowStockThreshold!: number;
  @ApiProperty({ description: 'Quantity at or below the threshold' })
  lowStock!: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt!: Date | null;
}

export class SupplyInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ maxLength: 80 }) name!: string;
  @ApiProperty({ minimum: 0 }) initialQuantity!: number;
  @ApiProperty({ minimum: 0 }) lowStockThreshold!: number;
}

export class SupplyChangeDto {
  @ApiProperty({ maxLength: 80 }) name!: string;
  @ApiProperty({ minimum: 0 }) lowStockThreshold!: number;
}

export class SupplyMovementInputDto {
  @ApiProperty({ minimum: 1, description: 'Whole units' }) quantity!: number;
}

export class SupplyMovementDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) supplyId!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ format: 'date-time' }) recordedAt!: Date;
  @ApiProperty({ description: 'Stock after this movement' })
  quantityOnHand!: number;
}

export class WithdrawalDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) supplyId!: string;
  @ApiProperty() supplyName!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ format: 'date-time' }) recordedAt!: Date;
}

export class WithdrawalTotalDto {
  @ApiProperty({ format: 'uuid' }) supplyId!: string;
  @ApiProperty() supplyName!: string;
  @ApiProperty({ description: 'Units withdrawn in the month' })
  quantity!: number;
}

export class WithdrawalPageDto {
  @ApiProperty({ example: '2026-09', description: 'Bolivia month' })
  month!: string;
  @ApiProperty({ type: WithdrawalDto, isArray: true }) items!: WithdrawalDto[];
  @ApiProperty({ type: WithdrawalTotalDto, isArray: true })
  totals!: WithdrawalTotalDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
}

export const parseSupplyQuery = (value: unknown) =>
  z.strictObject({ branchId: uuid }).safeParse(value);

export const parseSupplyInput = (value: unknown) =>
  z
    .strictObject({
      branchId: uuid,
      name: text(80),
      initialQuantity: count(0),
      lowStockThreshold: count(0),
    })
    .safeParse(value);

export const parseSupplyChange = (value: unknown) =>
  z
    .strictObject({ name: text(80), lowStockThreshold: count(0) })
    .safeParse(value);

export const parseMovementInput = (value: unknown) =>
  z.strictObject({ quantity: count(1) }).safeParse(value);

export const parseWithdrawalQuery = (value: unknown) =>
  z
    .strictObject({
      branchId: uuid,
      month,
      supplyId: uuid.optional(),
      ...paging,
    })
    .safeParse(value);

// ---------- Salary Payments ----------

export class AdminSalaryPaymentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) staffMemberId!: string;
  @ApiProperty() staffMemberName!: string;
  @ApiProperty({ description: 'BOB centavos' }) amountCentavos!: number;
  @ApiProperty({ format: 'date', description: 'Bolivia civil date' })
  paidOn!: string;
}

export class AdminSalaryPaymentPageDto {
  @ApiProperty({ type: AdminSalaryPaymentDto, isArray: true })
  items!: AdminSalaryPaymentDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
}

export class SalaryPaymentInputDto {
  @ApiProperty({ format: 'uuid' }) staffMemberId!: string;
  @ApiProperty({ minimum: 1, description: 'BOB centavos' })
  amountCentavos!: number;
  @ApiProperty({ format: 'date', description: 'Today or earlier in Bolivia' })
  paidOn!: string;
}

export const parseSalaryPaymentInput = (value: unknown) =>
  z
    .strictObject({
      staffMemberId: uuid,
      amountCentavos: centavos,
      paidOn: civilDate,
    })
    .safeParse(value);

export const parseSalaryPaymentQuery = (value: unknown) =>
  z
    .strictObject({
      staffMemberId: uuid.optional(),
      from: civilDate.optional(),
      to: civilDate.optional(),
      ...paging,
    })
    .safeParse(value);

// ---------- Expenses ----------

export class AdminExpenseCategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Referenced by an Expense, so not deletable' })
  inUse!: boolean;
}

export class ExpenseCategoryInputDto {
  @ApiProperty({ maxLength: 60 }) name!: string;
}

export class AdminExpenseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) expenseCategoryId!: string;
  @ApiProperty() expenseCategoryName!: string;
  @ApiProperty({ description: 'BOB centavos' }) amountCentavos!: number;
  @ApiProperty({ format: 'date', description: 'Bolivia civil date' })
  incurredOn!: string;
}

export class AdminExpensePageDto {
  @ApiProperty({ type: AdminExpenseDto, isArray: true })
  items!: AdminExpenseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalItems!: number;
}

export class ExpenseInputDto {
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty({ format: 'uuid' }) expenseCategoryId!: string;
  @ApiProperty({ minimum: 1, description: 'BOB centavos' })
  amountCentavos!: number;
  @ApiProperty({ format: 'date', description: 'Today or earlier in Bolivia' })
  incurredOn!: string;
}

export class ExpenseChangeDto {
  @ApiProperty({ format: 'uuid' }) expenseCategoryId!: string;
  @ApiProperty({ minimum: 1, description: 'BOB centavos' })
  amountCentavos!: number;
  @ApiProperty({ format: 'date', description: 'Today or earlier in Bolivia' })
  incurredOn!: string;
}

export const parseExpenseCategoryInput = (value: unknown) =>
  z.strictObject({ name: text(60) }).safeParse(value);

export const parseExpenseInput = (value: unknown) =>
  z
    .strictObject({
      branchId: uuid,
      expenseCategoryId: uuid,
      amountCentavos: centavos,
      incurredOn: civilDate,
    })
    .safeParse(value);

export const parseExpenseChange = (value: unknown) =>
  z
    .strictObject({
      expenseCategoryId: uuid,
      amountCentavos: centavos,
      incurredOn: civilDate,
    })
    .safeParse(value);

export const parseExpenseQuery = (value: unknown) =>
  z
    .strictObject({
      branchId: uuid,
      expenseCategoryId: uuid.optional(),
      from: civilDate.optional(),
      to: civilDate.optional(),
      ...paging,
    })
    .safeParse(value);

// ---------- Report ----------

export class ExpenseCategoryTotalDto {
  @ApiProperty({ format: 'uuid' }) expenseCategoryId!: string;
  @ApiProperty() expenseCategoryName!: string;
  @ApiProperty({ description: 'BOB centavos' }) totalCentavos!: number;
}

export class ExpenseMonthDto {
  @ApiProperty({
    format: 'date',
    description: 'First day of the Bolivia month',
  })
  month!: string;
  @ApiProperty() totalCentavos!: number;
}

export class ExpenseReportDto {
  @ApiProperty({ format: 'date-time' }) from!: Date;
  @ApiProperty({ format: 'date-time' }) until!: Date;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  branchId!: string | null;
  @ApiProperty({ description: 'Expenses plus Salary Payments, BOB centavos' })
  totalCentavos!: number;
  @ApiProperty() expensesCentavos!: number;
  @ApiProperty({
    description: 'Studio-wide; always 0 when a Branch is selected',
  })
  salaryPaymentsCentavos!: number;
  @ApiProperty({ type: ExpenseCategoryTotalDto, isArray: true })
  byCategory!: ExpenseCategoryTotalDto[];
  @ApiProperty({ type: ExpenseMonthDto, isArray: true })
  months!: ExpenseMonthDto[];
  @ApiProperty({ format: 'date-time' }) generatedAt!: Date;
}

export const parseExpenseReportQuery = (value: unknown) =>
  z
    .strictObject({
      from: z.iso.datetime(),
      until: z.iso.datetime(),
      branchId: uuid.optional(),
    })
    .refine(({ from, until }) => new Date(from) < new Date(until))
    .transform(({ from, until, ...input }) => ({
      ...input,
      from: new Date(from),
      until: new Date(until),
    }))
    .safeParse(value);
