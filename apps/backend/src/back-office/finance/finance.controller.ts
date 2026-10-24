import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import { contingencyPercent } from './opening-budget';
import { MonthResultDto, OpeningBudgetSeedDto } from './finance.dto';

const civilMonth = (date: Date): string => date.toISOString().slice(0, 10);

// BKO-005: «Finanzas». The report controller already owns this path, so the
// month result and the opening-budget seed live here beside it.
@Controller({ path: 'administrator/reports', version: '1' })
@ApiBearerAuth()
export class AdministratorFinanceController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get('finance')
  @ApiOperation({ operationId: 'getMonthResult' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  @ApiOkResponse({ type: MonthResultDto })
  @Header('Cache-Control', 'no-store')
  async finance(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month: string,
  ): Promise<MonthResultDto> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid month',
      });
    }
    const principal = await this.authenticate(authorization);
    const result = await run(() =>
      this.operations.finance.monthResult(
        { month: new Date(`${month}-01T00:00:00.000Z`) },
        principal,
      ),
    );
    return {
      ...result,
      month: civilMonth(result.month),
      contingencyPercent,
    };
  }

  @Post('finance/opening-budget')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'seedOpeningBudget' })
  @ApiOkResponse({ type: OpeningBudgetSeedDto })
  @Header('Cache-Control', 'no-store')
  async seedOpeningBudget(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<OpeningBudgetSeedDto> {
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.finance.seedOpeningBudget(principal));
  }
}
