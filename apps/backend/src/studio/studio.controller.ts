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
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
import { NarrativeReportController } from './narrative.controller';
import { StudioError } from './studio-errors';
import { studioOperations, type StudioOperations } from './studio-operations';
import {
  MonthKpisDto,
  parseStudioRecompute,
  RecommendationDto,
  RecommendationListDto,
  RecommendationRecomputeDto,
  RevenueReportDto,
  StudioRecomputeDto,
  StudioRecomputeInputDto,
} from './studio.dto';

export { studioOperations } from './studio-operations';
export type {
  MonthKpiReport,
  RecommendationView,
  RevenueReport,
  StudioOperations,
} from './studio-operations';

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

const refuse = (error: unknown): never => {
  if (error instanceof StudioError) {
    throw new HttpException(
      { code: error.code, detail: error.message },
      error.status,
    );
  }
  throw error;
};

@Controller({ path: 'administrator/recommendations', version: '1' })
@ApiBearerAuth()
export class RecommendationsController {
  constructor(
    @Inject(studioOperations) private readonly operations: StudioOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listRecommendations' })
  @ApiQuery({ name: 'month', required: true, example: '2026-10' })
  @ApiOkResponse({ type: RecommendationListDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month: string,
  ): Promise<RecommendationListDto> {
    if (!monthPattern.test(month)) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid recommendation month',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.recommendations({ month }, principal);
    } catch (error) {
      return refuse(error);
    }
  }

  @Post('recompute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'recomputeRecommendations' })
  @ApiBody({ type: StudioRecomputeInputDto })
  @ApiOkResponse({ type: RecommendationRecomputeDto })
  @Header('Cache-Control', 'no-store')
  async recompute(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<RecommendationRecomputeDto> {
    const parsed = parseStudioRecompute(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid recommendation month',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.recomputeRecommendations(
        parsed.data,
        principal,
      );
    } catch (error) {
      return refuse(error);
    }
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'dismissRecommendation' })
  @ApiOkResponse({ type: RecommendationDto })
  @Header('Cache-Control', 'no-store')
  async dismiss(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecommendationDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.dismissRecommendation({ id }, principal);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return refuse(error);
    }
  }
}

export const studioControllers = [
  StudioFactsController,
  RevenueReportController,
  RecommendationsController,
  NarrativeReportController,
];
