import {
  Body,
  Controller,
  Delete,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { StaffEmailBudget } from '../../system-identity/staff-email-budget/staff-email-budget.guard';
import {
  invalidRequest,
  requireStaffMemberId,
  run,
  staffManagementOperations,
  type StaffManagementOperations,
} from './staff-management.controller';
import {
  CorrectStaffEmailDto,
  parseCorrectStaffEmail,
  StaffMemberDto,
} from './staff-management.dto';

// FIX-039: the studio's confirmed change of an active member's login email,
// beside the other Administrator staff routes (no-store, ADR-0063).
@Controller({ path: 'administrator/staff-members', version: '1' })
@ApiBearerAuth()
export class AdministratorStaffEmailChangeController {
  constructor(
    @Inject(staffManagementOperations)
    private readonly operations: StaffManagementOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  // FIX-039: the studio asks to change an active member's login email; the
  // link goes to the new address and the change waits for it (IDN-008).
  @Post(':staffMemberId/email-change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'requestStaffMemberEmailChange' })
  @StaffEmailBudget('verification')
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiBody({ type: CorrectStaffEmailDto })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async requestEmailChange(
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
        this.operations.requestEmailChange(
          { staffMemberId: id, email: parsed.email },
          principal,
        ),
      response,
    );
  }

  @Post(':staffMemberId/email-change/resends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'resendStaffMemberEmailChange' })
  @StaffEmailBudget('verification')
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async resendEmailChange(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StaffMemberDto> {
    const id = requireStaffMemberId(staffMemberId);
    const principal = await this.authenticate(authorization);
    return run(
      () => this.operations.resendEmailChange({ staffMemberId: id }, principal),
      response,
    );
  }

  @Delete(':staffMemberId/email-change')
  @ApiOperation({ operationId: 'cancelStaffMemberEmailChange' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiOkResponse({ type: StaffMemberDto })
  @Header('Cache-Control', 'no-store')
  async cancelEmailChange(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StaffMemberDto> {
    const id = requireStaffMemberId(staffMemberId);
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.cancelEmailChange({ staffMemberId: id }, principal),
    );
  }
}
