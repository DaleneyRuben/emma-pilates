import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { parseUuid } from '../booking.dto';
import type {
  BranchSummary,
  ClassTypeSummary,
  PlanSummary,
  SessionDetail,
} from '../catalog/catalog-repository';
import { deprecatedDurationMonths } from '../catalog/plan-validity';
import type { ClientProfile } from './client-profile';
import type { ClientSubscriptionView } from './client-subscription';
import {
  BranchDto,
  ClassTypeDto,
  ClientProfileDto,
  ClientSubscriptionDto,
  parseUpdateClientProfile,
  PlanDto,
  SessionDetailDto,
  UpdateClientProfileDto,
} from './client-discovery.dto';
import { denyNonClients } from './deny-non-clients';

export const clientProfile = Symbol('clientProfile');
export const clientSubscription = Symbol('clientSubscription');
export const clientProfileUpdate = Symbol('clientProfileUpdate');
export const planCatalog = Symbol('planCatalog');
export const branchCatalog = Symbol('branchCatalog');
export const classTypeCatalog = Symbol('classTypeCatalog');

// Released apps still read it; a Class Type has no duration (booking ADR-0004).
const deprecatedClassTypeMinutes = 60;
export const sessionDetail = Symbol('sessionDetail');

type ClientProfileHandler = (
  principal: AuthenticatedPrincipal,
) => Promise<ClientProfile>;
type ClientSubscriptionHandler = (
  principal: AuthenticatedPrincipal,
) => Promise<ClientSubscriptionView>;
type ClientProfileUpdateHandler = (
  command: { name: string; phone: string | null },
  principal: AuthenticatedPrincipal,
) => Promise<ClientProfile>;
export type PlanCatalogHandler = {
  list(): Promise<PlanSummary[]>;
  find(planId: string): Promise<PlanSummary | null>;
};
type BranchCatalogHandler = () => Promise<BranchSummary[]>;
type ClassTypeCatalogHandler = () => Promise<ClassTypeSummary[]>;
type SessionDetailHandler = (
  sessionId: string,
) => Promise<SessionDetail | null>;

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

const civilDate = (date: Date): string => date.toISOString().slice(0, 10);

const toPlanDto = (plan: PlanSummary): PlanDto => ({
  id: plan.id,
  name: plan.name,
  durationDays: plan.durationDays,
  weeklyClassCap: plan.weeklyClassCap,
  durationMonths: deprecatedDurationMonths(plan.durationDays),
  classAllowance: plan.classAllowance,
  priceCentavos: plan.priceCentavos,
});

@Controller({ path: 'clients/current', version: '1' })
@ApiBearerAuth()
export class ClientProfileController {
  constructor(
    @Inject(clientProfile) private readonly loadProfile: ClientProfileHandler,
    @Inject(clientSubscription)
    private readonly loadSubscription: ClientSubscriptionHandler,
    @Inject(clientProfileUpdate)
    private readonly updateProfile: ClientProfileUpdateHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getCurrentClientProfile' })
  @ApiOkResponse({ type: ClientProfileDto })
  async profile(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClientProfileDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return denyNonClients(() => this.loadProfile(principal));
  }

  @Patch()
  @ApiOperation({ operationId: 'updateCurrentClientProfile' })
  @ApiBody({ type: UpdateClientProfileDto })
  @ApiOkResponse({ type: ClientProfileDto })
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<ClientProfileDto> {
    const parsed = parseUpdateClientProfile(body);
    if (parsed === null) throw invalidRequest('Invalid profile update');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    try {
      return await denyNonClients(() => this.updateProfile(parsed, principal));
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Client name is required'
      ) {
        throw new BadRequestException({
          code: 'client_name_required',
          detail: 'Client name is required',
        });
      }
      throw error;
    }
  }

  @Get('subscription')
  @ApiOperation({ operationId: 'getCurrentClientSubscription' })
  @ApiOkResponse({ type: ClientSubscriptionDto })
  async subscription(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClientSubscriptionDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    const view = await denyNonClients(() => this.loadSubscription(principal));

    return {
      status: view.status,
      subscription:
        view.subscription === null
          ? null
          : {
              id: view.subscription.id,
              planName: view.subscription.planName,
              originalClassAllowance: view.subscription.originalClassAllowance,
              remainingClassAllowance:
                view.subscription.remainingClassAllowance,
              startsOn: civilDate(view.subscription.startsOn),
              endsOn: civilDate(view.subscription.endsOn),
              extraClassesLine: view.subscription.extraClassesLine,
            },
    };
  }
}

@Controller({ path: 'plans', version: '1' })
@ApiBearerAuth()
export class PlanCatalogController {
  constructor(
    @Inject(planCatalog) private readonly plans: PlanCatalogHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listPlans' })
  @ApiOkResponse({ type: PlanDto, isArray: true })
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PlanDto[]> {
    await authenticateBearer(this.principalResolver, authorization);
    return (await this.plans.list()).map(toPlanDto);
  }

  @Get(':planId')
  @ApiOperation({ operationId: 'getPlan' })
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiOkResponse({ type: PlanDto })
  async get(
    @Param('planId') planId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PlanDto> {
    const parsedPlanId = parseUuid(planId);
    if (parsedPlanId === null) throw invalidRequest('Invalid Plan identifier');
    await authenticateBearer(this.principalResolver, authorization);
    const plan = await this.plans.find(parsedPlanId);

    if (plan === null) {
      throw new NotFoundException({
        code: 'plan_not_found',
        detail: 'Plan not found',
      });
    }

    return toPlanDto(plan);
  }
}

@Controller({ path: 'branches', version: '1' })
@ApiBearerAuth()
export class BranchCatalogController {
  constructor(
    @Inject(branchCatalog) private readonly listBranches: BranchCatalogHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listBranches' })
  @ApiOkResponse({ type: BranchDto, isArray: true })
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<BranchDto[]> {
    await authenticateBearer(this.principalResolver, authorization);
    return this.listBranches();
  }
}

@Controller({ path: 'class-types', version: '1' })
@ApiBearerAuth()
export class ClassTypeCatalogController {
  constructor(
    @Inject(classTypeCatalog)
    private readonly listClassTypes: ClassTypeCatalogHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listClassTypes' })
  @ApiOkResponse({ type: ClassTypeDto, isArray: true })
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClassTypeDto[]> {
    await authenticateBearer(this.principalResolver, authorization);
    return (await this.listClassTypes()).map((classType) => ({
      id: classType.id,
      name: classType.name,
      description: classType.description,
      durationMinutes: deprecatedClassTypeMinutes,
    }));
  }
}

@Controller({ path: 'sessions', version: '1' })
@ApiBearerAuth()
export class SessionDetailController {
  constructor(
    @Inject(sessionDetail)
    private readonly findSessionDetail: SessionDetailHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get(':sessionId')
  @ApiOperation({ operationId: 'getSession' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOkResponse({ type: SessionDetailDto })
  async get(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<SessionDetailDto> {
    const parsedSessionId = parseUuid(sessionId);
    if (parsedSessionId === null) {
      throw invalidRequest('Invalid Session identifier');
    }
    await authenticateBearer(this.principalResolver, authorization);
    const detail = await this.findSessionDetail(parsedSessionId);

    if (detail === null) {
      throw new NotFoundException({
        code: 'session_not_found',
        detail: 'Session not found',
      });
    }

    return detail;
  }
}
