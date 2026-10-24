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
import { z } from 'zod';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../system-identity/authentication/bearer-principal';
import { StudioError } from './studio-errors';
import { studioOperations, type StudioOperations } from './studio-operations';
import {
  NarrativeQuestionDto,
  NarrativeQuestionInputDto,
  NarrativeReportDto,
} from './studio.dto';

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const questionBody = z.object({
  month: z.string().regex(monthPattern),
  question: z.string().trim().min(1).max(200),
});

const readQuestion = (body: unknown): { month: string; question: string } => {
  const parsed = questionBody.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'invalid_request',
      detail: 'Invalid narrative question',
    });
  }
  return parsed.data;
};

const refuse = (error: unknown): never => {
  if (error instanceof StudioError) {
    throw new HttpException(
      { code: error.code, detail: error.message },
      error.status,
    );
  }
  throw error;
};

const invalid = (detail: string): never => {
  throw new BadRequestException({ code: 'invalid_request', detail });
};

@Controller({ path: 'administrator/reports/narrative', version: '1' })
@ApiBearerAuth()
export class NarrativeReportController {
  constructor(
    @Inject(studioOperations) private readonly operations: StudioOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getNarrativeReport' })
  @ApiQuery({ name: 'month', required: true, example: '2026-10' })
  @ApiOkResponse({ type: NarrativeReportDto })
  @Header('Cache-Control', 'no-store')
  async narrative(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month: string,
  ): Promise<NarrativeReportDto> {
    if (!monthPattern.test(month)) invalid('Invalid narrative month');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.narrative({ month }, principal);
    } catch (error) {
      return refuse(error);
    }
  }

  @Post('questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'askNarrativeQuestion' })
  @ApiBody({ type: NarrativeQuestionInputDto })
  @ApiOkResponse({ type: NarrativeQuestionDto })
  @Header('Cache-Control', 'no-store')
  async question(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<NarrativeQuestionDto> {
    const asked = readQuestion(body);
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.question(asked, principal);
    } catch (error) {
      return refuse(error);
    }
  }
}
