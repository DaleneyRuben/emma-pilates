import { Controller, Get, Header, Headers, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import { OwnSalaryPaymentDto } from './pay-statements.dto';

// «Mis pagos»: a Trainer reads the Salary Payments recorded for her in Nómina.
@Controller({ path: 'trainer/salary-payments', version: '1' })
@ApiBearerAuth()
export class TrainerSalaryPaymentsController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
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
    return payments.map((payment) => ({
      ...payment,
      paidOn: payment.paidOn.toISOString().slice(0, 10),
    }));
  }
}
