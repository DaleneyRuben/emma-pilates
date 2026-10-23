import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  idempotencyHeader,
  parsed,
  requireIdempotencyKey,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import {
  CashCloseDto,
  CashCloseHistoryDto,
  CashCloseInputDto,
  CashTodayDto,
  parseCashCloseHistoryQuery,
  parseCashCloseInput,
  parseCashTodayQuery,
  toCashCloseDto,
  toCashCloseHistoryDto,
  toCashTodayDto,
} from './cash-close.dto';

// «Cerrar caja» in the Staff app (S25): an Assistant at her Branch or an
// Administrator at any Branch closes today's cash.
@Controller({ path: 'cash-closes', version: '1' })
@ApiBearerAuth()
export class CashClosesController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get('today')
  @ApiOperation({ operationId: 'getTodayCashClose' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: CashTodayDto })
  @Header('Cache-Control', 'no-store')
  async today(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<CashTodayDto> {
    const input = parsed(parseCashTodayQuery(query), 'Invalid Branch');
    const principal = await this.authenticate(authorization);
    return toCashTodayDto(
      await run(() => this.operations.cashCloses.readToday(input, principal)),
    );
  }

  @Post()
  @ApiOperation({ operationId: 'recordCashClose' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: CashCloseInputDto })
  @ApiCreatedResponse({ type: CashCloseDto })
  @Header('Cache-Control', 'no-store')
  async record(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<CashCloseDto> {
    const input = parsed(parseCashCloseInput(body), 'Invalid Cash Close');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);
    return toCashCloseDto(
      await run(() =>
        this.operations.cashCloses.recordCashClose(input, principal, key),
      ),
    );
  }
}

// AW151: the Administrator's history of a Branch's closes, one month at a time.
@Controller({ path: 'administrator/cash-closes', version: '1' })
@ApiBearerAuth()
export class AdministratorCashClosesController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminCashCloses' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiQuery({ name: 'month', required: true, example: '2026-10' })
  @ApiOkResponse({ type: CashCloseHistoryDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<CashCloseHistoryDto> {
    const input = parsed(
      parseCashCloseHistoryQuery(query),
      'Invalid Cash Close filters',
    );
    const principal = await this.authenticate(authorization);
    return toCashCloseHistoryDto(
      await run(() =>
        this.operations.cashCloses.listCashCloses(input, principal),
      ),
    );
  }
}

export const cashCloseControllers = [
  CashClosesController,
  AdministratorCashClosesController,
];
