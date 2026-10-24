import {
  Body,
  Controller,
  Delete,
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
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import {
  evaluationCommands,
  idempotencyHeader,
  invalidRequest,
  privateRead,
  requireId,
  requireIdempotencyKey,
  runEvaluationCommand,
} from './evaluations.controller';
import {
  AvailabilityBlockDto,
  AvailabilityBlockEndDto,
  AvailabilityBlockEndInputDto,
  AvailabilityBlockInputDto,
  AvailabilityBlockReplacementDto,
  civilDate,
  NutritionistAgendaPageDto,
  parseAgendaQuery,
  parseAvailabilityBlockEnd,
  parseAvailabilityBlockInput,
} from './evaluations.dto';
import type {
  AvailabilityBlockView,
  EvaluationCommands,
} from './prisma-evaluation-commands';

const toBlockDto = (block: AvailabilityBlockView): AvailabilityBlockDto => ({
  ...block,
  effectiveFrom: civilDate(block.effectiveFrom),
  effectiveUntil:
    block.effectiveUntil === null ? null : civilDate(block.effectiveUntil),
});

@Controller({ path: 'nutritionist/evaluations', version: '1' })
@ApiBearerAuth()
export class NutritionistEvaluationsController {
  constructor(
    @Inject(evaluationCommands) private readonly commands: EvaluationCommands,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listNutritionistAgenda' })
  @ApiQuery({ name: 'from', required: false, format: 'date' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: NutritionistAgendaPageDto })
  @Header('Cache-Control', privateRead)
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<NutritionistAgendaPageDto> {
    const parsed = parseAgendaQuery(query);
    if (parsed === null) throw invalidRequest('Invalid agenda query');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runEvaluationCommand(() =>
      this.commands.listNutritionistAgenda(parsed, principal),
    );
  }

  @Delete(':evaluationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'cancelNutritionistEvaluation' })
  @ApiParam({ name: 'evaluationId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Param('evaluationId') evaluationId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(evaluationId, 'Invalid Evaluation identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    await runEvaluationCommand(() =>
      this.commands.cancelEvaluationAsStaff(id, principal),
    );
  }

  @Post(':evaluationId/no-show')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'recordEvaluationNoShow' })
  @ApiParam({ name: 'evaluationId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async noShow(
    @Param('evaluationId') evaluationId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(evaluationId, 'Invalid Evaluation identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    await runEvaluationCommand(() =>
      this.commands.recordEvaluationNoShow(id, principal),
    );
  }
}

@Controller({ path: 'nutritionist/availability-blocks', version: '1' })
@ApiBearerAuth()
export class NutritionistAvailabilityBlocksController {
  constructor(
    @Inject(evaluationCommands) private readonly commands: EvaluationCommands,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listAvailabilityBlocks' })
  @ApiOkResponse({ type: AvailabilityBlockDto, isArray: true })
  @Header('Cache-Control', privateRead)
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AvailabilityBlockDto[]> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    const blocks = await runEvaluationCommand(() =>
      this.commands.listAvailabilityBlocks(principal),
    );
    return blocks.map(toBlockDto);
  }

  @Post()
  @ApiOperation({ operationId: 'createAvailabilityBlock' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: AvailabilityBlockInputDto })
  @ApiCreatedResponse({ type: AvailabilityBlockDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<AvailabilityBlockDto> {
    const parsed = parseAvailabilityBlockInput(body);
    if (parsed === null) throw invalidRequest('Invalid Availability Block');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return toBlockDto(
      await runEvaluationCommand(() =>
        this.commands.createAvailabilityBlock(parsed, principal, key),
      ),
    );
  }

  @Post(':blockId/replacement')
  @ApiOperation({ operationId: 'replaceAvailabilityBlock' })
  @ApiParam({ name: 'blockId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: AvailabilityBlockInputDto })
  @ApiCreatedResponse({ type: AvailabilityBlockReplacementDto })
  @Header('Cache-Control', 'no-store')
  async replace(
    @Param('blockId') blockId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<AvailabilityBlockReplacementDto> {
    const id = requireId(blockId, 'Invalid Availability Block identifier');
    const parsed = parseAvailabilityBlockInput(body);
    if (parsed === null) throw invalidRequest('Invalid Availability Block');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    const result = await runEvaluationCommand(() =>
      this.commands.replaceAvailabilityBlock(
        { ...parsed, blockId: id },
        principal,
        key,
      ),
    );
    return {
      ended: toBlockDto(result.ended),
      replacement: toBlockDto(result.replacement),
      withdrawnSlots: result.withdrawnSlots,
      keptEvaluations: result.keptEvaluations,
    };
  }

  @Post(':blockId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'endAvailabilityBlock' })
  @ApiParam({ name: 'blockId', format: 'uuid' })
  @ApiBody({ type: AvailabilityBlockEndInputDto })
  @ApiOkResponse({ type: AvailabilityBlockEndDto })
  @Header('Cache-Control', 'no-store')
  async end(
    @Param('blockId') blockId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AvailabilityBlockEndDto> {
    const id = requireId(blockId, 'Invalid Availability Block identifier');
    const parsed = parseAvailabilityBlockEnd(body);
    if (parsed === null) throw invalidRequest('Invalid end date');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    const result = await runEvaluationCommand(() =>
      this.commands.endAvailabilityBlock({ ...parsed, blockId: id }, principal),
    );
    return {
      block: toBlockDto(result.block),
      withdrawnSlots: result.withdrawnSlots,
      keptEvaluations: result.keptEvaluations,
    };
  }
}
