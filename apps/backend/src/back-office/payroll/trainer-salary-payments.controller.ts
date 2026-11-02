import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
  run,
  type BackOfficeOperations,
  type ReceiptStorage,
  streamSalaryReceipt,
} from '../back-office-http';
import { OwnSalaryPaymentDto } from './pay-statements.dto';

// «Mis pagos»: a Trainer reads the Salary Payments recorded for her in Nómina.
@Controller({ path: 'trainer/salary-payments', version: '1' })
@ApiBearerAuth()
export class TrainerSalaryPaymentsController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
    @Inject(OBJECT_STORAGE) private readonly storage: ReceiptStorage,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listOwnSalaryPayments' })
  @ApiOkResponse({ type: OwnSalaryPaymentDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<OwnSalaryPaymentDto[]> {
    const principal = await this.authenticate(authorization);
    const payments = await run(() =>
      this.operations.salaryPayments.listOwnSalaryPayments(principal),
    );
    return payments.map(({ receiptImageAssetId, ...payment }) => ({
      ...payment,
      paidOn: payment.paidOn.toISOString().slice(0, 10),
      receiptUrl:
        receiptImageAssetId === null
          ? null
          : `/api/v1/trainer/salary-payments/${payment.id}/receipt`,
    }));
  }

  // BKO-008: `readable` fits the enlarged viewer, `thumbnail` a list row.
  @Get(':salaryPaymentId/receipt')
  @ApiOperation({ operationId: 'getOwnSalaryPaymentReceipt' })
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
        this.operations.salaryReceipts.readOwnSalaryReceipt(command, principal),
      this.storage,
      { salaryPaymentId, variant },
      response,
    );
  }
}
