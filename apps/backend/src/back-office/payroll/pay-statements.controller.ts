import {
  applyDecorators,
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  parsed,
  requireId,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import { civilText, parsePayPeriod, type PayPeriod } from './pay-period';
import {
  parsePayStatementApproval,
  PayStatementApprovalDto,
  PayStatementDraftDto,
  PayStatementDto,
} from './pay-statements.dto';
import { TrainerSalaryPaymentsController } from './trainer-salary-payments.controller';

const toDto = <
  Statement extends {
    month: Date;
    periodStart: Date;
    periodEnd: Date;
    approvableOn: Date;
  },
>(
  statement: Statement,
) => ({
  ...statement,
  month: civilText(statement.month),
  periodStart: civilText(statement.periodStart),
  periodEnd: civilText(statement.periodEnd),
  approvableOn: civilText(statement.approvableOn),
});

const requirePeriod = (query: {
  month?: string;
  from?: string;
  until?: string;
}): PayPeriod => {
  const period = parsePayPeriod(query);
  if (period === null) {
    throw new BadRequestException({
      code: 'invalid_request',
      detail: 'Invalid period',
    });
  }
  return period;
};

// BKO-009: a month, as the released clients send it, or any period.
const periodQueries = () =>
  applyDecorators(
    ApiQuery({ name: 'month', required: false, example: '2026-09' }),
    ApiQuery({
      name: 'from',
      required: false,
      example: '2026-09-07',
      description: 'First civil date of the period, with until',
    }),
    ApiQuery({
      name: 'until',
      required: false,
      example: '2026-09-14',
      description: 'The civil date after the last one (exclusive)',
    }),
  );

// BKO-006: the Administrator drafts and approves; a Trainer reads her own.
@Controller({ path: 'administrator/pay-statements', version: '1' })
@ApiBearerAuth()
export class AdministratorPayStatementsController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listPayStatements' })
  @periodQueries()
  @ApiOkResponse({ type: PayStatementDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month?: string,
    @Query('from') from?: string,
    @Query('until') until?: string,
  ): Promise<PayStatementDto[]> {
    const period = requirePeriod({ month, from, until });
    const principal = await this.authenticate(authorization);
    const statements = await run(() =>
      this.operations.payStatements.listStatements(period, principal),
    );
    return statements.map(toDto);
  }

  @Post('draft')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'draftPayStatements' })
  @periodQueries()
  @ApiOkResponse({ type: PayStatementDraftDto })
  async draft(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month?: string,
    @Query('from') from?: string,
    @Query('until') until?: string,
  ): Promise<PayStatementDraftDto> {
    const period = requirePeriod({ month, from, until });
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.payStatements.draftPeriodAsAdministrator(
        period,
        principal,
      ),
    );
  }

  @Post(':statementId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'approvePayStatement' })
  @ApiParam({ name: 'statementId', format: 'uuid' })
  @ApiBody({ type: PayStatementApprovalDto })
  @ApiOkResponse({ type: PayStatementDto })
  async approve(
    @Headers('authorization') authorization: string | undefined,
    @Param('statementId') statementId: string,
    @Body() body: unknown,
  ): Promise<PayStatementDto> {
    const id = requireId(statementId, 'Invalid Pay Statement identifier');
    const { receiptImageAssetId } = parsed(
      parsePayStatementApproval(body),
      'Invalid Pay Statement approval',
    );
    const principal = await this.authenticate(authorization);
    return toDto(
      await run(() =>
        this.operations.payStatements.approveStatement(
          {
            statementId: id,
            ...(receiptImageAssetId === undefined
              ? {}
              : { receiptImageAssetId }),
          },
          principal,
        ),
      ),
    );
  }
}

// BKO-007: the Coordinator never reads her own statement. The endpoint
// exists so the denial is explicit rather than a missing route.
@Controller({ path: 'coordinator/pay-statements', version: '1' })
@ApiBearerAuth()
export class CoordinatorPayStatementsController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listCoordinatorPayStatements' })
  @ApiOkResponse({ type: PayStatementDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PayStatementDto[]> {
    const principal = await this.authenticate(authorization);
    const statements = await run(() =>
      this.operations.payStatements.listOwnStatements(principal),
    );
    return statements.map(toDto);
  }
}

@Controller({ path: 'trainer/pay-statements', version: '1' })
@ApiBearerAuth()
export class TrainerPayStatementsController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listOwnPayStatements' })
  @ApiOkResponse({ type: PayStatementDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PayStatementDto[]> {
    const principal = await this.authenticate(authorization);
    const statements = await run(() =>
      this.operations.payStatements.listOwnStatements(principal),
    );
    return statements.map(toDto);
  }
}

export const payrollControllers = [
  AdministratorPayStatementsController,
  CoordinatorPayStatementsController,
  TrainerPayStatementsController,
  TrainerSalaryPaymentsController,
];
