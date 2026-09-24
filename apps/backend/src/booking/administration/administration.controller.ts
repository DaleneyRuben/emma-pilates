import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
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
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { parseUuid } from '../booking.dto';
import { runEvaluationCommand } from '../evaluations/evaluations.controller';
import { AdministrationError } from './administration-errors';
import {
  AdminBranchDto,
  AdminClassTypeDto,
  AdminCreditPageDto,
  AdminEvaluationPageDto,
  AdminPlanDto,
  AdminReferralPageDto,
  AdminSessionDto,
  AdminSessionScheduleDto,
  BranchInputDto,
  ClassTypeInputDto,
  IncomeReportDto,
  parseBranchInput,
  parseClassTypeInput,
  parseEvaluationListQuery,
  parseIncomeQuery,
  parsePlanInput,
  parsePlanVisibility,
  parseScheduleEnd,
  parseScheduleInput,
  parseScheduleQuery,
  parseSearchListQuery,
  parseSessionChange,
  parseSessionInput,
  PlanInputDto,
  PlanVisibilityDto,
  SessionChangeDto,
  SessionInputDto,
  SessionScheduleCreationDto,
  SessionScheduleEndDto,
  SessionScheduleEndInputDto,
  SessionScheduleInputDto,
  SessionScheduleReplacementDto,
} from './administration.dto';
import type { CatalogAdministration } from './prisma-catalog-administration';
import type { Oversight } from './prisma-oversight';
import type { ScheduleAdministration } from './prisma-schedule-administration';

export const administrationOperations = Symbol('administrationOperations');

export type AdministrationOperations = {
  catalog: CatalogAdministration;
  schedules: ScheduleAdministration;
  oversight: Oversight;
  cancelEvaluation: (
    evaluationId: string,
    principal: AuthenticatedPrincipal,
  ) => Promise<void>;
};

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

export const run = async <Result>(
  work: () => Promise<Result>,
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AdministrationError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    throw error;
  }
};

export const parsed = <Value>(
  result: { success: true; data: Value } | { success: false },
  detail: string,
): Value => {
  if (!result.success) throw invalidRequest(detail);
  return result.data;
};

const requireId = (value: string, detail: string): string => {
  const id = parseUuid(value);
  if (id === null) throw invalidRequest(detail);
  return id;
};

const civil = (date: Date | null): string | null =>
  date === null ? null : date.toISOString().slice(0, 10);

type ScheduleRow = {
  id: string;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  weekday: number;
  startsAtLocal: Date;
  capacity: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  classType: { durationMinutes: number; name: string };
};

const toScheduleDto = (schedule: ScheduleRow): AdminSessionScheduleDto => ({
  id: schedule.id,
  branchId: schedule.branchId,
  classTypeId: schedule.classTypeId,
  trainerStaffMemberId: schedule.trainerStaffMemberId,
  weekday: schedule.weekday,
  startsAtLocal: schedule.startsAtLocal.toISOString().slice(11, 16),
  capacity: schedule.capacity,
  effectiveFrom: civil(schedule.effectiveFrom)!,
  effectiveUntil: civil(schedule.effectiveUntil),
  classTypeName: schedule.classType.name,
  durationMinutes: schedule.classType.durationMinutes,
});

const toSessionDto = (session: {
  id: string;
  sessionScheduleId: string | null;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  state: string;
  isException: boolean;
}): AdminSessionDto => ({
  ...session,
  state: session.state === 'CANCELLED' ? 'cancelled' : 'scheduled',
});

abstract class AdministrationController {
  constructor(
    protected readonly operations: AdministrationOperations,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

@Controller({ path: 'administrator/branches', version: '1' })
@ApiBearerAuth()
export class AdministratorBranchesController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Post()
  @ApiOperation({ operationId: 'createBranch' })
  @ApiBody({ type: BranchInputDto })
  @ApiCreatedResponse({ type: AdminBranchDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminBranchDto> {
    const input = parsed(parseBranchInput(body), 'Invalid Branch');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.catalog.createBranch(input, principal));
  }

  @Put(':branchId')
  @ApiOperation({ operationId: 'updateBranch' })
  @ApiParam({ name: 'branchId', format: 'uuid' })
  @ApiBody({ type: BranchInputDto })
  @ApiOkResponse({ type: AdminBranchDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('branchId') branchId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminBranchDto> {
    const id = requireId(branchId, 'Invalid Branch identifier');
    const input = parsed(parseBranchInput(body), 'Invalid Branch');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.catalog.updateBranch(
        { ...input, branchId: id },
        principal,
      ),
    );
  }

  @Post(':branchId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'archiveBranch' })
  @ApiParam({ name: 'branchId', format: 'uuid' })
  @ApiOkResponse({ type: AdminBranchDto })
  @Header('Cache-Control', 'no-store')
  async archive(
    @Param('branchId') branchId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminBranchDto> {
    const id = requireId(branchId, 'Invalid Branch identifier');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.catalog.archiveBranch({ branchId: id }, principal),
    );
  }
}

@Controller({ path: 'administrator/class-types', version: '1' })
@ApiBearerAuth()
export class AdministratorClassTypesController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Post()
  @ApiOperation({ operationId: 'createClassType' })
  @ApiBody({ type: ClassTypeInputDto })
  @ApiCreatedResponse({ type: AdminClassTypeDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminClassTypeDto> {
    const input = parsed(parseClassTypeInput(body), 'Invalid Class Type');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.catalog.createClassType(input, principal));
  }

  @Put(':classTypeId')
  @ApiOperation({ operationId: 'updateClassType' })
  @ApiParam({ name: 'classTypeId', format: 'uuid' })
  @ApiBody({ type: ClassTypeInputDto })
  @ApiOkResponse({ type: AdminClassTypeDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('classTypeId') classTypeId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminClassTypeDto> {
    const id = requireId(classTypeId, 'Invalid Class Type identifier');
    const input = parsed(parseClassTypeInput(body), 'Invalid Class Type');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.catalog.updateClassType(
        { ...input, classTypeId: id },
        principal,
      ),
    );
  }

  @Post(':classTypeId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'archiveClassType' })
  @ApiParam({ name: 'classTypeId', format: 'uuid' })
  @ApiOkResponse({ type: AdminClassTypeDto })
  @Header('Cache-Control', 'no-store')
  async archive(
    @Param('classTypeId') classTypeId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminClassTypeDto> {
    const id = requireId(classTypeId, 'Invalid Class Type identifier');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.catalog.archiveClassType({ classTypeId: id }, principal),
    );
  }
}

@Controller({ path: 'administrator/plans', version: '1' })
@ApiBearerAuth()
export class AdministratorPlansController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Post()
  @ApiOperation({ operationId: 'createPlan' })
  @ApiBody({ type: PlanInputDto })
  @ApiCreatedResponse({ type: AdminPlanDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminPlanDto> {
    const input = parsed(parsePlanInput(body), 'Invalid Plan');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.catalog.createPlan(input, principal));
  }

  @Put(':planId')
  @ApiOperation({ operationId: 'updatePlan' })
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiBody({ type: PlanInputDto })
  @ApiOkResponse({ type: AdminPlanDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('planId') planId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminPlanDto> {
    const id = requireId(planId, 'Invalid Plan identifier');
    const input = parsed(parsePlanInput(body), 'Invalid Plan');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.catalog.updatePlan({ ...input, planId: id }, principal),
    );
  }

  @Put(':planId/visibility')
  @ApiOperation({ operationId: 'setPlanVisibility' })
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiBody({ type: PlanVisibilityDto })
  @ApiOkResponse({ type: AdminPlanDto })
  @Header('Cache-Control', 'no-store')
  async visibility(
    @Param('planId') planId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminPlanDto> {
    const id = requireId(planId, 'Invalid Plan identifier');
    const input = parsed(parsePlanVisibility(body), 'Invalid visibility');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.catalog.setPlanVisibility(
        { planId: id, visible: input.visible },
        principal,
      ),
    );
  }
}

@Controller({ path: 'administrator/session-schedules', version: '1' })
@ApiBearerAuth()
export class AdministratorSessionSchedulesController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listSessionSchedules' })
  @ApiQuery({ name: 'branchId', required: false, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: AdminSessionScheduleDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminSessionScheduleDto[]> {
    const input = parsed(parseScheduleQuery(query), 'Invalid schedule filters');
    const principal = await this.authenticate(authorization);
    const schedules = await run(() =>
      this.operations.schedules.listSchedules(input, principal),
    );
    return schedules.map(toScheduleDto);
  }

  @Post()
  @ApiOperation({ operationId: 'createSessionSchedule' })
  @ApiBody({ type: SessionScheduleInputDto })
  @ApiCreatedResponse({ type: SessionScheduleCreationDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<SessionScheduleCreationDto> {
    const input = parsed(parseScheduleInput(body), 'Invalid Session Schedule');
    const principal = await this.authenticate(authorization);
    const result = await run(() =>
      this.operations.schedules.createSchedule(input, principal),
    );
    return { ...result, schedule: toScheduleDto(result.schedule) };
  }

  @Post(':scheduleId/replacement')
  @ApiOperation({ operationId: 'replaceSessionSchedule' })
  @ApiParam({ name: 'scheduleId', format: 'uuid' })
  @ApiBody({ type: SessionScheduleInputDto })
  @ApiCreatedResponse({ type: SessionScheduleReplacementDto })
  @Header('Cache-Control', 'no-store')
  async replace(
    @Param('scheduleId') scheduleId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<SessionScheduleReplacementDto> {
    const id = requireId(scheduleId, 'Invalid Session Schedule identifier');
    const input = parsed(parseScheduleInput(body), 'Invalid Session Schedule');
    const principal = await this.authenticate(authorization);
    const result = await run(() =>
      this.operations.schedules.replaceSchedule(
        { ...input, sessionScheduleId: id },
        principal,
      ),
    );
    return {
      ...result,
      ended: toScheduleDto(result.ended),
      replacement: toScheduleDto(result.replacement),
    };
  }

  @Post(':scheduleId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'endSessionSchedule' })
  @ApiParam({ name: 'scheduleId', format: 'uuid' })
  @ApiBody({ type: SessionScheduleEndInputDto })
  @ApiOkResponse({ type: SessionScheduleEndDto })
  @Header('Cache-Control', 'no-store')
  async end(
    @Param('scheduleId') scheduleId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<SessionScheduleEndDto> {
    const id = requireId(scheduleId, 'Invalid Session Schedule identifier');
    const input = parsed(parseScheduleEnd(body), 'Invalid end date');
    const principal = await this.authenticate(authorization);
    const result = await run(() =>
      this.operations.schedules.endSchedule(
        { ...input, sessionScheduleId: id },
        principal,
      ),
    );
    return { ...result, schedule: toScheduleDto(result.schedule) };
  }
}

@Controller({ path: 'administrator/sessions', version: '1' })
@ApiBearerAuth()
export class AdministratorSessionEditsController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Post()
  @ApiOperation({ operationId: 'createOneOffSession' })
  @ApiBody({ type: SessionInputDto })
  @ApiCreatedResponse({ type: AdminSessionDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminSessionDto> {
    const input = parsed(parseSessionInput(body), 'Invalid Session');
    const principal = await this.authenticate(authorization);
    return toSessionDto(
      await run(() =>
        this.operations.schedules.createSession(input, principal),
      ),
    );
  }

  @Patch(':sessionId')
  @ApiOperation({ operationId: 'updateSession' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiBody({ type: SessionChangeDto })
  @ApiOkResponse({ type: AdminSessionDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminSessionDto> {
    const id = requireId(sessionId, 'Invalid Session identifier');
    const input = parsed(parseSessionChange(body), 'Invalid Session change');
    const principal = await this.authenticate(authorization);
    return toSessionDto(
      await run(() =>
        this.operations.schedules.updateSession(
          { sessionId: id, ...input },
          principal,
        ),
      ),
    );
  }
}

@Controller({ path: 'administrator', version: '1' })
@ApiBearerAuth()
export class AdministratorOversightController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get('evaluations')
  @ApiOperation({ operationId: 'listAdminEvaluations' })
  @ApiQuery({ name: 'from', required: true, format: 'date-time' })
  @ApiQuery({ name: 'until', required: true, format: 'date-time' })
  @ApiQuery({
    name: 'nutritionistStaffMemberId',
    required: false,
    schema: { format: 'uuid' },
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminEvaluationPageDto })
  @Header('Cache-Control', 'no-store')
  async evaluations(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminEvaluationPageDto> {
    const input = parsed(
      parseEvaluationListQuery(query),
      'Invalid Evaluation filters',
    );
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.oversight.listEvaluations(input, principal),
    );
  }

  @Delete('evaluations/:evaluationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'cancelAdminEvaluation' })
  @ApiParam({ name: 'evaluationId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async cancelEvaluation(
    @Param('evaluationId') evaluationId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(evaluationId, 'Invalid Evaluation identifier');
    const principal = await this.authenticate(authorization);
    await runEvaluationCommand(() =>
      this.operations.cancelEvaluation(id, principal),
    );
  }

  @Get('referrals')
  @ApiOperation({ operationId: 'listAdminReferrals' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminReferralPageDto })
  @Header('Cache-Control', 'no-store')
  async referrals(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminReferralPageDto> {
    const input = parsed(
      parseSearchListQuery(query),
      'Invalid Referral filters',
    );
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.oversight.listReferrals(input, principal));
  }

  @Get('credits')
  @ApiOperation({ operationId: 'listAdminCredits' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminCreditPageDto })
  @Header('Cache-Control', 'no-store')
  async credits(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminCreditPageDto> {
    const input = parsed(parseSearchListQuery(query), 'Invalid Credit filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.oversight.listCredits(input, principal));
  }

  @Get('reports/income')
  @ApiOperation({ operationId: 'getIncomeReport' })
  @ApiQuery({ name: 'from', required: true, format: 'date-time' })
  @ApiQuery({ name: 'until', required: true, format: 'date-time' })
  @ApiQuery({ name: 'branchId', required: false, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: IncomeReportDto })
  @Header('Cache-Control', 'no-store')
  async income(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<IncomeReportDto> {
    const input = parsed(parseIncomeQuery(query), 'Invalid report range');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.oversight.incomeReport(input, principal));
  }
}

export const administrationControllers = [
  AdministratorBranchesController,
  AdministratorClassTypesController,
  AdministratorPlansController,
  AdministratorSessionSchedulesController,
  AdministratorSessionEditsController,
  AdministratorOversightController,
];
