import { parseCivilMonth } from '../civil-month';
import {
  BadRequestException,
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
  requireId,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import { PayStatementDraftDto, PayStatementDto } from './pay-statements.dto';

const civil = (date: Date): string => date.toISOString().slice(0, 10);

const toDto = <Statement extends { month: Date }>(statement: Statement) => ({
  ...statement,
  month: civil(statement.month),
});

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
  @ApiQuery({ name: 'month', required: true, example: '2026-09' })
  @ApiOkResponse({ type: PayStatementDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month: string,
  ): Promise<PayStatementDto[]> {
    const civilMonthStart = parseCivilMonth(month);
    if (civilMonthStart === null) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid month',
      });
    }
    const principal = await this.authenticate(authorization);
    const statements = await run(() =>
      this.operations.payStatements.listStatements(
        { month: civilMonthStart },
        principal,
      ),
    );
    return statements.map(toDto);
  }

  @Post('draft')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'draftPayStatements' })
  @ApiQuery({ name: 'month', required: true, example: '2026-09' })
  @ApiOkResponse({ type: PayStatementDraftDto })
  async draft(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month: string,
  ): Promise<PayStatementDraftDto> {
    const civilMonthStart = parseCivilMonth(month);
    if (civilMonthStart === null) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid month',
      });
    }
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.payStatements.draftMonthAsAdministrator(
        civilMonthStart,
        principal,
      ),
    );
  }

  @Post(':statementId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'approvePayStatement' })
  @ApiParam({ name: 'statementId', format: 'uuid' })
  @ApiOkResponse({ type: PayStatementDto })
  async approve(
    @Headers('authorization') authorization: string | undefined,
    @Param('statementId') statementId: string,
  ): Promise<PayStatementDto> {
    const id = requireId(statementId, 'Invalid Pay Statement identifier');
    const principal = await this.authenticate(authorization);
    return toDto(
      await run(() =>
        this.operations.payStatements.approveStatement(
          { statementId: id },
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
