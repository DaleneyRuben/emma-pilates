import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { OBJECT_STORAGE } from '../../uploads/object-storage.module';
import { receiptVariants } from '../../uploads/private-image-object';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  idempotencyHeader,
  parsed,
  requireId,
  requireIdempotencyKey,
  run,
  type BackOfficeOperations,
  type ReceiptStorage,
  streamSalaryReceipt,
} from '../back-office-http';
import {
  AdminSalaryPaymentDto,
  AdminSalaryPaymentPageDto,
  parseSalaryPaymentInput,
  parseSalaryPaymentQuery,
  SalaryPaymentInputDto,
} from '../back-office.dto';

// BKO-008: the page names a receipt by its route, never the asset.
const toSalaryPaymentDto = <
  Payment extends {
    id: string;
    paidOn: Date;
    receiptImageAssetId: string | null;
  },
>({
  receiptImageAssetId,
  ...payment
}: Payment) => ({
  ...payment,
  paidOn: payment.paidOn.toISOString().slice(0, 10),
  receiptUrl:
    receiptImageAssetId === null
      ? null
      : `/api/v1/administrator/salary-payments/${payment.id}/receipt`,
});

// AW11 and AW12: the studio-wide Salary Payments (BKO-002).
@Controller({ path: 'administrator/salary-payments', version: '1' })
@ApiBearerAuth()
export class AdministratorSalaryPaymentsController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
    @Inject(OBJECT_STORAGE) private readonly storage: ReceiptStorage,
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

  // BKO-008: `readable` fits the enlarged viewer, `thumbnail` a list row.
  @Get(':salaryPaymentId/receipt')
  @ApiOperation({ operationId: 'getSalaryPaymentReceipt' })
  @ApiParam({ name: 'salaryPaymentId', format: 'uuid' })
  @ApiQuery({ name: 'variant', required: false, enum: receiptVariants })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async receipt(
    @Param('salaryPaymentId') salaryPaymentId: string,
    @Query('variant') variant: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const principal = await this.authenticate(authorization);
    return streamSalaryReceipt(
      (command) =>
        this.operations.salaryReceipts.readAnySalaryReceipt(command, principal),
      this.storage,
      { salaryPaymentId, variant },
      response,
    );
  }
}
