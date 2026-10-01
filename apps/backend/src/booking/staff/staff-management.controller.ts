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
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
import {
  StaffManagementError,
  type StaffDirectoryPage,
  type StaffDirectoryQuery,
  type StaffManagementErrorCode,
  type StaffMemberRecord,
  type StaffRoleName,
} from './staff-management';
import {
  ChangeStaffBranchesDto,
  ChangeStaffRoleDto,
  CorrectStaffEmailDto,
  CreateStaffMemberDto,
  parseChangeStaffBranches,
  parseChangeStaffRole,
  parseCorrectStaffEmail,
  parseCreateStaffMember,
  parseStaffDirectoryQuery,
  parseStaffMemberId,
  StaffMemberDto,
  StaffMemberPageDto,
} from './staff-management.dto';

export const staffManagementOperations = Symbol('staffManagementOperations');

type Principal = AuthenticatedPrincipal;

export type StaffManagementOperations = {
  list: (
    query: StaffDirectoryQuery,
    principal: Principal,
  ) => Promise<StaffDirectoryPage>;
  read: (
    command: { staffMemberId: string },
    principal: Principal,
  ) => Promise<StaffMemberRecord>;
  create: (
    command: {
      name: string;
      email: string;
      phone: string | null;
      role: StaffRoleName;
      branchIds: string[];
    },
    principal: Principal,
  ) => Promise<StaffMemberRecord>;
  resendActivation: (
    command: { staffMemberId: string },
    principal: Principal,
  ) => Promise<StaffMemberRecord>;
  changeRole: (
    command: {
      staffMemberId: string;
      role: StaffRoleName;
      branchIds?: string[];
    },
    principal: Principal,
  ) => Promise<StaffMemberRecord>;
  changeBranches: (
    command: { staffMemberId: string; branchIds: string[] },
    principal: Principal,
  ) => Promise<StaffMemberRecord>;
  deactivate: (
    command: { staffMemberId: string },
    principal: Principal,
  ) => Promise<StaffMemberRecord>;
  correctEmail: (
    command: { staffMemberId: string; email: string },
    principal: Principal,
  ) => Promise<StaffMemberRecord>;
  cancelInvitation: (
    command: { staffMemberId: string },
    principal: Principal,
  ) => Promise<void>;
};

const statuses: Record<StaffManagementErrorCode, number> = {
  staff_access_denied: HttpStatus.FORBIDDEN,
  staff_member_not_found: HttpStatus.NOT_FOUND,
  email_in_use: HttpStatus.CONFLICT,
  email_throttled: HttpStatus.TOO_MANY_REQUESTS,
  invalid_branch_assignment: HttpStatus.BAD_REQUEST,
  trainer_has_upcoming_sessions: HttpStatus.CONFLICT,
  last_administrator: HttpStatus.CONFLICT,
  own_staff_member: HttpStatus.CONFLICT,
  staff_member_deactivated: HttpStatus.CONFLICT,
  staff_member_not_pending: HttpStatus.CONFLICT,
  email_belongs_to_client: HttpStatus.CONFLICT,
  email_unchanged: HttpStatus.BAD_REQUEST,
};

const details: Record<StaffManagementErrorCode, string> = {
  staff_access_denied: 'Staff management is limited to Administrators',
  staff_member_not_found: 'Staff Member not found',
  email_in_use: 'Email already belongs to another Account',
  email_throttled: 'Too many emails were sent to this recipient',
  invalid_branch_assignment:
    'Branches must exist, be active, and suit the Role',
  trainer_has_upcoming_sessions:
    'The Trainer still leads upcoming Sessions or Session Schedules',
  last_administrator: 'The last active Administrator cannot be removed',
  own_staff_member: 'Administrators cannot change their own Staff Member',
  staff_member_deactivated: 'The Staff Member is deactivated',
  staff_member_not_pending: 'The Staff Member already activated',
  email_belongs_to_client: 'Email belongs to a Client Account',
  email_unchanged: 'The invitation already uses this email',
};

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

// WEB-012 W6: a limited staff email says when it can be retried (ADR-0029).
const run = async <Result>(
  work: () => Promise<Result>,
  response?: Response,
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof StaffManagementError) {
      if (error.code === 'email_throttled' && error.retryAfterSeconds > 0) {
        response?.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      throw new HttpException(
        { code: error.code, detail: details[error.code] },
        statuses[error.code],
      );
    }
    throw error;
  }
};

const requireStaffMemberId = (value: string): string => {
  const id = parseStaffMemberId(value);
  if (id === null) throw invalidRequest('Invalid Staff Member identifier');
  return id;
};

// Administrator staff management (IDN-007): staff data is personal, so every
// response is `no-store` (ADR-0063).
@Controller({ path: 'administrator/staff-members', version: '1' })
@ApiBearerAuth()
export class AdministratorStaffMembersController {
  constructor(
    @Inject(staffManagementOperations)
    private readonly operations: StaffManagementOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get()
  @ApiOperation({ operationId: 'listStaffMembers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['trainer', 'nutritionist', 'assistant', 'administrator'],
  })
  @ApiQuery({ name: 'branchId', required: false, schema: { format: 'uuid' } })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'active', 'deactivated'],
  })
  @ApiOkResponse({ type: StaffMemberPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: Record<string, unknown>,
  ): Promise<StaffMemberPageDto> {
    const parsed = parseStaffDirectoryQuery(query);
    if (parsed === null) throw invalidRequest('Invalid Staff Member filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.list(parsed, principal));
  }

  @Post()
  @ApiOperation({ operationId: 'createStaffMember' })
  @ApiBody({ type: CreateStaffMemberDto })
  @ApiCreatedResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StaffMemberDto> {
    const parsed = parseCreateStaffMember(body);
    if (parsed === null) throw invalidRequest('Invalid Staff Member');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.create(parsed, principal), response);
  }

  @Get(':staffMemberId')
  @ApiOperation({ operationId: 'getStaffMember' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StaffMemberDto> {
    const id = requireStaffMemberId(staffMemberId);
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.read({ staffMemberId: id }, principal));
  }

  @Post(':staffMemberId/activation-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'resendStaffMemberActivation' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async resend(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StaffMemberDto> {
    const id = requireStaffMemberId(staffMemberId);
    const principal = await this.authenticate(authorization);
    return run(
      () => this.operations.resendActivation({ staffMemberId: id }, principal),
      response,
    );
  }

  @Post(':staffMemberId/email-corrections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'correctStaffMemberEmail' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiBody({ type: CorrectStaffEmailDto })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async correctEmail(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StaffMemberDto> {
    const id = requireStaffMemberId(staffMemberId);
    const parsed = parseCorrectStaffEmail(body);
    if (parsed === null) throw invalidRequest('A valid email is required');
    const principal = await this.authenticate(authorization);
    return run(
      () =>
        this.operations.correctEmail(
          { staffMemberId: id, email: parsed.email },
          principal,
        ),
      response,
    );
  }

  @Post(':staffMemberId/invitation-cancellation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'cancelStaffMemberInvitation' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async cancelInvitation(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireStaffMemberId(staffMemberId);
    const principal = await this.authenticate(authorization);
    await run(() =>
      this.operations.cancelInvitation({ staffMemberId: id }, principal),
    );
  }

  @Put(':staffMemberId/role')
  @ApiOperation({ operationId: 'changeStaffMemberRole' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiBody({ type: ChangeStaffRoleDto })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async changeRole(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<StaffMemberDto> {
    const id = requireStaffMemberId(staffMemberId);
    const parsed = parseChangeStaffRole(body);
    if (parsed === null) throw invalidRequest('Invalid Role change');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.changeRole({ staffMemberId: id, ...parsed }, principal),
    );
  }

  @Put(':staffMemberId/branches')
  @ApiOperation({ operationId: 'changeStaffMemberBranches' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiBody({ type: ChangeStaffBranchesDto })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async changeBranches(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<StaffMemberDto> {
    const id = requireStaffMemberId(staffMemberId);
    const parsed = parseChangeStaffBranches(body);
    if (parsed === null) throw invalidRequest('Invalid Branch assignment');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.changeBranches(
        { staffMemberId: id, ...parsed },
        principal,
      ),
    );
  }

  @Post(':staffMemberId/deactivation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'deactivateStaffMember' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async deactivate(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StaffMemberDto> {
    const id = requireStaffMemberId(staffMemberId);
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.deactivate({ staffMemberId: id }, principal),
    );
  }
}
