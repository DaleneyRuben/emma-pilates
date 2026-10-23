import {
  Body,
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
  ApiBody,
  ApiCreatedResponse,
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
  parsed,
  requireId,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import {
  EquipmentDto,
  EquipmentFlaggedSessionDto,
  EquipmentInputDto,
  EquipmentIssueDto,
  EquipmentIssueInputDto,
  EquipmentIssuePageDto,
  equipmentIssueStatuses,
  EquipmentListDto,
  parseEquipmentInput,
  parseEquipmentQuery,
  parseFlagQuery,
  parseIssueInput,
  parseIssueQuery,
} from './equipment.dto';
import { TrainerSessionEquipmentController } from './trainer-equipment.controller';

abstract class EquipmentController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }
}

// AW37: a Branch's Equipment (BKO-004, ADR-0106).
@Controller({ path: 'administrator/equipment', version: '1' })
@ApiBearerAuth()
export class AdministratorEquipmentController extends EquipmentController {
  @Get()
  @ApiOperation({ operationId: 'listEquipment' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: EquipmentListDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<EquipmentListDto> {
    const input = parsed(parseEquipmentQuery(query), 'Invalid Branch');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.equipment.listEquipment(input, principal));
  }

  @Post()
  @ApiOperation({ operationId: 'createEquipment' })
  @ApiBody({ type: EquipmentInputDto })
  @ApiCreatedResponse({ type: EquipmentDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<EquipmentDto> {
    const input = parsed(parseEquipmentInput(body), 'Invalid Equipment');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipment.createEquipment(input, principal),
    );
  }

  @Post(':equipmentId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'archiveEquipment' })
  @ApiParam({ name: 'equipmentId', format: 'uuid' })
  @ApiOkResponse({ type: EquipmentDto })
  @Header('Cache-Control', 'no-store')
  async archive(
    @Param('equipmentId') equipmentId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<EquipmentDto> {
    const id = requireId(equipmentId, 'Invalid Equipment identifier');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipment.archiveEquipment(
        { equipmentId: id },
        principal,
      ),
    );
  }

  @Post(':equipmentId/issues')
  @ApiOperation({ operationId: 'reportEquipmentIssue' })
  @ApiParam({ name: 'equipmentId', format: 'uuid' })
  @ApiBody({ type: EquipmentIssueInputDto })
  @ApiCreatedResponse({ type: EquipmentIssueDto })
  @Header('Cache-Control', 'no-store')
  async report(
    @Param('equipmentId') equipmentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<EquipmentIssueDto> {
    const id = requireId(equipmentId, 'Invalid Equipment identifier');
    const input = parsed(parseIssueInput(body), 'Invalid fault report');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipment.reportIssue(
        { ...input, equipmentId: id },
        principal,
      ),
    );
  }
}

// AW37's «Fallas» card: open and resolved Equipment Issues.
@Controller({ path: 'administrator/equipment-issues', version: '1' })
@ApiBearerAuth()
export class AdministratorEquipmentIssuesController extends EquipmentController {
  @Get()
  @ApiOperation({ operationId: 'listEquipmentIssues' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiQuery({ name: 'status', required: false, enum: equipmentIssueStatuses })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: EquipmentIssuePageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<EquipmentIssuePageDto> {
    const input = parsed(parseIssueQuery(query), 'Invalid fault filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.equipment.listIssues(input, principal));
  }

  @Post(':issueId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'resolveEquipmentIssue' })
  @ApiParam({ name: 'issueId', format: 'uuid' })
  @ApiOkResponse({ type: EquipmentIssueDto })
  @Header('Cache-Control', 'no-store')
  async resolve(
    @Param('issueId') issueId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<EquipmentIssueDto> {
    const id = requireId(issueId, 'Invalid fault identifier');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipment.resolveIssue({ issueId: id }, principal),
    );
  }
}

// AW02: the future Sessions with more places than working Equipment.
@Controller({ path: 'administrator/equipment-flags', version: '1' })
@ApiBearerAuth()
export class AdministratorEquipmentFlagsController extends EquipmentController {
  @Get()
  @ApiOperation({ operationId: 'listEquipmentFlaggedSessions' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiQuery({ name: 'from', required: true, schema: { format: 'date-time' } })
  @ApiQuery({ name: 'until', required: true, schema: { format: 'date-time' } })
  @ApiOkResponse({ type: EquipmentFlaggedSessionDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<EquipmentFlaggedSessionDto[]> {
    const input = parsed(parseFlagQuery(query), 'Invalid range');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipment.listFlaggedSessions(input, principal),
    );
  }
}

export const equipmentControllers = [
  AdministratorEquipmentController,
  AdministratorEquipmentIssuesController,
  AdministratorEquipmentFlagsController,
  TrainerSessionEquipmentController,
];
