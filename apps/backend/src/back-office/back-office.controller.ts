import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../system-identity/authentication/bearer-principal';
import { BackOfficeError } from './back-office-errors';
import {
  AdminExpenseCategoryDto,
  AdminExpenseDto,
  AdminExpensePageDto,
  AdminSalaryPaymentDto,
  AdminSalaryPaymentPageDto,
  AdminSupplyDto,
  ExpenseCategoryInputDto,
  ExpenseChangeDto,
  ExpenseInputDto,
  ExpenseReportDto,
  parseExpenseCategoryInput,
  parseExpenseChange,
  parseExpenseInput,
  parseExpenseQuery,
  parseExpenseReportQuery,
  parseMovementInput,
  parseSalaryPaymentInput,
  parseSalaryPaymentQuery,
  parseSupplyChange,
  parseSupplyInput,
  parseSupplyQuery,
  parseUuidValue,
  parseWithdrawalQuery,
  SalaryPaymentInputDto,
  SupplyChangeDto,
  SupplyInputDto,
  SupplyMovementDto,
  SupplyMovementInputDto,
  WithdrawalPageDto,
} from './back-office.dto';
import type { Expenses } from './expenses/prisma-expenses';
import type { SalaryPayments } from './payroll/prisma-salary-payments';
import type { ExpenseReport } from './reports/prisma-expense-report';
import type { Supplies } from './supplies/prisma-supplies';

export const backOfficeOperations = Symbol('backOfficeOperations');

export type BackOfficeOperations = {
  supplies: Supplies;
  salaryPayments: SalaryPayments;
  expenses: Expenses;
  report: ExpenseReport;
};

const idempotencyHeader = {
  name: 'idempotency-key',
  required: true,
  schema: { format: 'uuid' },
} as const;

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof BackOfficeError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    throw error;
  }
};

const parsed = <Value>(
  result: { success: true; data: Value } | { success: false },
  detail: string,
): Value => {
  if (!result.success) throw invalidRequest(detail);
  return result.data;
};

const requireId = (value: string, detail: string): string => {
  const id = parseUuidValue(value);
  if (id === null) throw invalidRequest(detail);
  return id;
};

const requireIdempotencyKey = (value: string | undefined): string => {
  const key = parseUuidValue(value);
  if (key === null) throw invalidRequest('Idempotency-Key must be a UUID');
  return key;
};

const civil = (date: Date): string => date.toISOString().slice(0, 10);

const toSalaryPaymentDto = <Payment extends { paidOn: Date }>(
  payment: Payment,
) => ({ ...payment, paidOn: civil(payment.paidOn) });

const toExpenseDto = <Expense extends { incurredOn: Date }>(
  expense: Expense,
) => ({ ...expense, incurredOn: civil(expense.incurredOn) });

abstract class BackOfficeController {
  constructor(
    protected readonly operations: BackOfficeOperations,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

@Controller({ path: 'administrator/supplies', version: '1' })
@ApiBearerAuth()
export class AdministratorSuppliesController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminSupplies' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: AdminSupplyDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminSupplyDto[]> {
    const input = parsed(parseSupplyQuery(query), 'Invalid Supply filters');
    const principal = await this.authenticate(authorization);
    const page = await run(() =>
      this.operations.supplies.listSupplies(
        { ...input, status: 'active', page: 1, pageSize: 100 },
        principal,
      ),
    );
    return page.items;
  }

  @Post()
  @ApiOperation({ operationId: 'createSupply' })
  @ApiBody({ type: SupplyInputDto })
  @ApiCreatedResponse({ type: AdminSupplyDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminSupplyDto> {
    const input = parsed(parseSupplyInput(body), 'Invalid Supply');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.supplies.createSupply(input, principal));
  }

  @Put(':supplyId')
  @ApiOperation({ operationId: 'updateSupply' })
  @ApiParam({ name: 'supplyId', format: 'uuid' })
  @ApiBody({ type: SupplyChangeDto })
  @ApiOkResponse({ type: AdminSupplyDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('supplyId') supplyId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminSupplyDto> {
    const id = requireId(supplyId, 'Invalid Supply identifier');
    const input = parsed(parseSupplyChange(body), 'Invalid Supply');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.updateSupply(
        { ...input, supplyId: id },
        principal,
      ),
    );
  }

  @Post(':supplyId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'archiveSupply' })
  @ApiParam({ name: 'supplyId', format: 'uuid' })
  @ApiOkResponse({ type: AdminSupplyDto })
  @Header('Cache-Control', 'no-store')
  async archive(
    @Param('supplyId') supplyId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminSupplyDto> {
    const id = requireId(supplyId, 'Invalid Supply identifier');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.archiveSupply({ supplyId: id }, principal),
    );
  }

  @Post(':supplyId/withdrawals')
  @ApiOperation({ operationId: 'recordWithdrawal' })
  @ApiParam({ name: 'supplyId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: SupplyMovementInputDto })
  @ApiCreatedResponse({ type: SupplyMovementDto })
  @Header('Cache-Control', 'no-store')
  async withdraw(
    @Param('supplyId') supplyId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<SupplyMovementDto> {
    const id = requireId(supplyId, 'Invalid Supply identifier');
    const input = parsed(parseMovementInput(body), 'Invalid Withdrawal');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.recordWithdrawal(
        { supplyId: id, quantity: input.quantity },
        principal,
        key,
      ),
    );
  }

  @Post(':supplyId/restocks')
  @ApiOperation({ operationId: 'recordRestock' })
  @ApiParam({ name: 'supplyId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: SupplyMovementInputDto })
  @ApiCreatedResponse({ type: SupplyMovementDto })
  @Header('Cache-Control', 'no-store')
  async restock(
    @Param('supplyId') supplyId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<SupplyMovementDto> {
    const id = requireId(supplyId, 'Invalid Supply identifier');
    const input = parsed(parseMovementInput(body), 'Invalid Restock');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.recordRestock(
        { supplyId: id, quantity: input.quantity },
        principal,
        key,
      ),
    );
  }
}

@Controller({ path: 'administrator/withdrawals', version: '1' })
@ApiBearerAuth()
export class AdministratorWithdrawalsController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminWithdrawals' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiQuery({ name: 'month', required: true, example: '2026-09' })
  @ApiQuery({ name: 'supplyId', required: false, schema: { format: 'uuid' } })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: WithdrawalPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<WithdrawalPageDto> {
    const input = parsed(
      parseWithdrawalQuery(query),
      'Invalid Withdrawal filters',
    );
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.listWithdrawals(input, principal),
    );
  }
}

@Controller({ path: 'administrator/salary-payments', version: '1' })
@ApiBearerAuth()
export class AdministratorSalaryPaymentsController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminSalaryPayments' })
  @ApiQuery({
    name: 'staffMemberId',
    required: false,
    schema: { format: 'uuid' },
  })
  @ApiQuery({ name: 'from', required: false, format: 'date' })
  @ApiQuery({ name: 'to', required: false, format: 'date' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminSalaryPaymentPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminSalaryPaymentPageDto> {
    const input = parsed(
      parseSalaryPaymentQuery(query),
      'Invalid Salary Payment filters',
    );
    const principal = await this.authenticate(authorization);
    const page = await run(() =>
      this.operations.salaryPayments.listSalaryPayments(input, principal),
    );
    return { ...page, items: page.items.map(toSalaryPaymentDto) };
  }

  @Post()
  @ApiOperation({ operationId: 'recordSalaryPayment' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: SalaryPaymentInputDto })
  @ApiCreatedResponse({ type: AdminSalaryPaymentDto })
  @Header('Cache-Control', 'no-store')
  async record(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminSalaryPaymentDto> {
    const input = parsed(
      parseSalaryPaymentInput(body),
      'Invalid Salary Payment',
    );
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);
    return toSalaryPaymentDto(
      await run(() =>
        this.operations.salaryPayments.recordSalaryPayment(
          input,
          principal,
          key,
        ),
      ),
    );
  }

  @Put(':salaryPaymentId')
  @ApiOperation({ operationId: 'updateSalaryPayment' })
  @ApiParam({ name: 'salaryPaymentId', format: 'uuid' })
  @ApiBody({ type: SalaryPaymentInputDto })
  @ApiOkResponse({ type: AdminSalaryPaymentDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('salaryPaymentId') salaryPaymentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminSalaryPaymentDto> {
    const id = requireId(salaryPaymentId, 'Invalid Salary Payment identifier');
    const input = parsed(
      parseSalaryPaymentInput(body),
      'Invalid Salary Payment',
    );
    const principal = await this.authenticate(authorization);
    return toSalaryPaymentDto(
      await run(() =>
        this.operations.salaryPayments.updateSalaryPayment(
          { ...input, salaryPaymentId: id },
          principal,
        ),
      ),
    );
  }
}

@Controller({ path: 'administrator/expense-categories', version: '1' })
@ApiBearerAuth()
export class AdministratorExpenseCategoriesController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminExpenseCategories' })
  @ApiOkResponse({ type: AdminExpenseCategoryDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminExpenseCategoryDto[]> {
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.expenses.listExpenseCategories(principal));
  }

  @Post()
  @ApiOperation({ operationId: 'createExpenseCategory' })
  @ApiBody({ type: ExpenseCategoryInputDto })
  @ApiCreatedResponse({ type: AdminExpenseCategoryDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminExpenseCategoryDto> {
    const input = parsed(
      parseExpenseCategoryInput(body),
      'Invalid Expense Category',
    );
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.expenses.createExpenseCategory(input, principal),
    );
  }

  @Delete(':expenseCategoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteExpenseCategory' })
  @ApiParam({ name: 'expenseCategoryId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async remove(
    @Param('expenseCategoryId') expenseCategoryId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(
      expenseCategoryId,
      'Invalid Expense Category identifier',
    );
    const principal = await this.authenticate(authorization);
    await run(() =>
      this.operations.expenses.deleteExpenseCategory(
        { expenseCategoryId: id },
        principal,
      ),
    );
  }
}

@Controller({ path: 'administrator/expenses', version: '1' })
@ApiBearerAuth()
export class AdministratorExpensesController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminExpenses' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiQuery({
    name: 'expenseCategoryId',
    required: false,
    schema: { format: 'uuid' },
  })
  @ApiQuery({ name: 'from', required: false, format: 'date' })
  @ApiQuery({ name: 'to', required: false, format: 'date' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminExpensePageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminExpensePageDto> {
    const input = parsed(parseExpenseQuery(query), 'Invalid Expense filters');
    const principal = await this.authenticate(authorization);
    const page = await run(() =>
      this.operations.expenses.listExpenses(input, principal),
    );
    return { ...page, items: page.items.map(toExpenseDto) };
  }

  @Post()
  @ApiOperation({ operationId: 'recordExpense' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: ExpenseInputDto })
  @ApiCreatedResponse({ type: AdminExpenseDto })
  @Header('Cache-Control', 'no-store')
  async record(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminExpenseDto> {
    const input = parsed(parseExpenseInput(body), 'Invalid Expense');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);
    return toExpenseDto(
      await run(() =>
        this.operations.expenses.recordExpense(input, principal, key),
      ),
    );
  }

  @Put(':expenseId')
  @ApiOperation({ operationId: 'updateExpense' })
  @ApiParam({ name: 'expenseId', format: 'uuid' })
  @ApiBody({ type: ExpenseChangeDto })
  @ApiOkResponse({ type: AdminExpenseDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('expenseId') expenseId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminExpenseDto> {
    const id = requireId(expenseId, 'Invalid Expense identifier');
    const input = parsed(parseExpenseChange(body), 'Invalid Expense');
    const principal = await this.authenticate(authorization);
    return toExpenseDto(
      await run(() =>
        this.operations.expenses.updateExpense(
          { ...input, expenseId: id },
          principal,
        ),
      ),
    );
  }
}

@Controller({ path: 'administrator/reports', version: '1' })
@ApiBearerAuth()
export class AdministratorExpenseReportController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get('expenses')
  @ApiOperation({ operationId: 'getExpenseReport' })
  @ApiQuery({ name: 'from', required: true, format: 'date-time' })
  @ApiQuery({ name: 'until', required: true, format: 'date-time' })
  @ApiQuery({ name: 'branchId', required: false, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: ExpenseReportDto })
  @Header('Cache-Control', 'no-store')
  async expenses(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<ExpenseReportDto> {
    const input = parsed(
      parseExpenseReportQuery(query),
      'Invalid report range',
    );
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.report.expenseReport(input, principal));
  }
}

export const backOfficeControllers = [
  AdministratorSuppliesController,
  AdministratorWithdrawalsController,
  AdministratorSalaryPaymentsController,
  AdministratorExpenseCategoriesController,
  AdministratorExpensesController,
  AdministratorExpenseReportController,
];
