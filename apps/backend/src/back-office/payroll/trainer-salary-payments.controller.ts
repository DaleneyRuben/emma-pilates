import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { OBJECT_STORAGE } from '../../uploads/object-storage.module';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  run,
  type BackOfficeOperations,
  type ReceiptStorage,
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

  receipt(
    salaryPaymentId: string,
    variant: string | undefined,
    authorization: string | undefined,
    response: { setHeader(name: string, value: string): void },
  ): Promise<StreamableFile> {
    return Promise.reject(
      new BadRequestException(
        [salaryPaymentId, variant, authorization, response, this.storage]
          .length,
      ),
    );
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
    return payments.map((payment) => ({
      ...payment,
      paidOn: payment.paidOn.toISOString().slice(0, 10),
    }));
  }
}
