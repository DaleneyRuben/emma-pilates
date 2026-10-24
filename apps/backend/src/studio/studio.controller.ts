import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { StudioError } from './studio-errors';
import {
  MonthKpisDto,
  parseStudioRecompute,
  RevenueReportDto,
  StudioRecomputeDto,
  StudioRecomputeInputDto,
} from './studio.dto';

export const studioOperations = Symbol('studioOperations');

export type RevenueReport = {
  month: string;
  cashCentavos: number;
  accruedCentavos: number;
  deferredCentavos: number;
  classesStillOwed: number;
};

export type MonthKpiReport = {
  month: string;
  sessionsHeld: number;
  occupancyPercent: number;
  averageStudentsTimes10: number;
  averageAttendanceTimes10: number;
  noShowPercent: number;
  activeClients: number;
  newClients: number;
  renewedClients: number;
  renewalPercent: number;
  cashCentavos?: number;
  accruedCentavos?: number;
  deferredCentavos?: number;
  classesStillOwed?: number;
};

export type StudioOperations = {
  recompute(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ month: string; sessions: number; clientMonths: number }>;
  revenue(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<RevenueReport>;
  kpis(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<MonthKpiReport>;
};

@Controller({ path: 'administrator/studio-facts', version: '1' })
@ApiBearerAuth()
export class StudioFactsController {
  constructor(
    @Inject(studioOperations) private readonly operations: StudioOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post('recompute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'recomputeStudioFacts' })
  @ApiBody({ type: StudioRecomputeInputDto })
  @ApiOkResponse({ type: StudioRecomputeDto })
  @Header('Cache-Control', 'no-store')
  async recompute(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<StudioRecomputeDto> {
    const parsed = parseStudioRecompute(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid studio facts month',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.recompute(parsed.data, principal);
    } catch (error) {
      if (error instanceof StudioError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          error.status,
        );
      }
      throw error;
    }
  }
}

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

@Controller({ path: 'administrator/reports', version: '1' })
@ApiBearerAuth()
export class RevenueReportController {
  constructor(
    @Inject(studioOperations) private readonly operations: StudioOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get('revenue')
  @ApiOperation({ operationId: 'getRevenueReport' })
  @ApiQuery({ name: 'month', required: true, example: '2026-10' })
  @ApiOkResponse({ type: RevenueReportDto })
  @Header('Cache-Control', 'no-store')
  async revenue(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month: string,
  ): Promise<RevenueReportDto> {
    if (!monthPattern.test(month)) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid revenue month',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.revenue({ month }, principal);
    } catch (error) {
      if (error instanceof StudioError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          error.status,
        );
      }
      throw error;
    }
  }

  @Get('kpis')
  @ApiOperation({ operationId: 'getMonthKpis' })
  @ApiQuery({ name: 'month', required: true, example: '2026-10' })
  @ApiOkResponse({ type: MonthKpisDto })
  @Header('Cache-Control', 'no-store')
  async kpis(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month: string,
  ): Promise<MonthKpisDto> {
    if (!monthPattern.test(month)) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid kpi month',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.kpis({ month }, principal);
    } catch (error) {
      if (error instanceof StudioError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          error.status,
        );
      }
      throw error;
    }
  }
}

export const studioControllers = [
  StudioFactsController,
  RevenueReportController,
];
