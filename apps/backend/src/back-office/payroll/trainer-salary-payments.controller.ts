import { Controller, Get, Header, Headers, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  type BackOfficeOperations,
} from '../back-office-http';
import { OwnSalaryPaymentDto } from './pay-statements.dto';

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
  list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<OwnSalaryPaymentDto[]> {
    return Promise.resolve(authorization === undefined ? [] : []);
  }
}
