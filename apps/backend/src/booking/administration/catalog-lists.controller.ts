import {
  applyDecorators,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import { parsed, run } from './administration.controller';
import {
  AdminBranchPageDto,
  AdminClassTypePageDto,
  AdminPlanPageDto,
  catalogStatuses,
  parseCatalogStatusQuery,
  parsePlanListQuery,
  planVisibilities,
} from './catalog-lists.dto';
import type { CatalogLists } from './prisma-catalog-lists';

export const catalogListOperations = Symbol('catalogListOperations');

const PagingQueries = () =>
  applyDecorators(
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'pageSize', required: false, type: Number }),
  );

abstract class CatalogListController {
  constructor(
    protected readonly lists: CatalogLists,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

// WEB-003: the catalog tables' page-and-offset reads (ADR-0061/0062). The
// writes stay in administration.controller.ts under the same paths.
@Controller({ path: 'administrator/branches', version: '1' })
@ApiBearerAuth()
export class AdministratorBranchListController extends CatalogListController {
  constructor(
    @Inject(catalogListOperations) lists: CatalogLists,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(lists, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminBranches' })
  @ApiQuery({ name: 'status', required: false, enum: catalogStatuses })
  @PagingQueries()
  @ApiOkResponse({ type: AdminBranchPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminBranchPageDto> {
    const input = parsed(parseCatalogStatusQuery(query), 'Invalid filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.lists.listBranches(input, principal));
  }
}

@Controller({ path: 'administrator/class-types', version: '1' })
@ApiBearerAuth()
export class AdministratorClassTypeListController extends CatalogListController {
  constructor(
    @Inject(catalogListOperations) lists: CatalogLists,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(lists, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminClassTypes' })
  @ApiQuery({ name: 'status', required: false, enum: catalogStatuses })
  @PagingQueries()
  @ApiOkResponse({ type: AdminClassTypePageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminClassTypePageDto> {
    const input = parsed(parseCatalogStatusQuery(query), 'Invalid filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.lists.listClassTypes(input, principal));
  }
}

@Controller({ path: 'administrator/plans', version: '1' })
@ApiBearerAuth()
export class AdministratorPlanListController extends CatalogListController {
  constructor(
    @Inject(catalogListOperations) lists: CatalogLists,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(lists, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminPlans' })
  @ApiQuery({ name: 'visibility', required: false, enum: planVisibilities })
  @PagingQueries()
  @ApiOkResponse({ type: AdminPlanPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminPlanPageDto> {
    const input = parsed(parsePlanListQuery(query), 'Invalid filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.lists.listPlans(input, principal));
  }
}

export const catalogListControllers = [
  AdministratorBranchListController,
  AdministratorClassTypeListController,
  AdministratorPlanListController,
];
