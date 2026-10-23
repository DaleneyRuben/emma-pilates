import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  Inject,
  Param,
  Put,
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
import type { DeclaredAcquisitionChannel } from './acquisition';
import { acquisitionProblem } from './acquisition-errors';
import {
  ClientAcquisitionDto,
  CorrectClientAcquisitionDto,
  parseCorrectClientAcquisition,
  parseSetTrainerReferralCode,
  SetTrainerReferralCodeDto,
  TrainerReferralCodeDto,
} from './acquisition.dto';
import type { ClientAcquisitionView } from './client-acquisition';
import type { TrainerReferralCodeView } from './trainer-referral-code';

export const acquisitionOperations = Symbol('acquisitionOperations');

type Principal = AuthenticatedPrincipal;

export type AcquisitionOperations = {
  readClient: (
    command: { clientId: string },
    principal: Principal,
  ) => Promise<ClientAcquisitionView>;
  correctClient: (
    command: {
      clientId: string;
      channel: DeclaredAcquisitionChannel;
      referralCode: string | null;
    },
    principal: Principal,
  ) => Promise<ClientAcquisitionView>;
  readTrainerCode: (
    command: { staffMemberId: string },
    principal: Principal,
  ) => Promise<TrainerReferralCodeView>;
  setTrainerCode: (
    command: { staffMemberId: string; referralCode: string | null },
    principal: Principal,
  ) => Promise<TrainerReferralCodeView>;
};

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

const requireId = (value: string, what: string): string => {
  const id = parseUuid(value);
  if (id === null) throw invalidRequest(`Invalid ${what} identifier`);
  return id;
};

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    const problem = acquisitionProblem(error);
    if (problem === null) throw error;
    throw new HttpException(
      { code: problem.code, detail: problem.detail },
      problem.status,
    );
  }
};

abstract class AcquisitionController {
  constructor(
    @Inject(acquisitionOperations)
    protected readonly operations: AcquisitionOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

// BKM-011 (AW22): how a Client found the studio, for the roles the use case
// allows. Personal data, so nothing is cached (ADR-0063).
@Controller({ path: 'administrator/clients', version: '1' })
@ApiBearerAuth()
export class AdministratorClientAcquisitionController extends AcquisitionController {
  @Get(':clientId/acquisition')
  @ApiOperation({ operationId: 'getClientAcquisition' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: ClientAcquisitionDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClientAcquisitionDto> {
    const id = requireId(clientId, 'Client');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.readClient({ clientId: id }, principal));
  }

  @Put(':clientId/acquisition')
  @ApiOperation({ operationId: 'correctClientAcquisition' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiBody({ type: CorrectClientAcquisitionDto })
  @ApiOkResponse({ type: ClientAcquisitionDto })
  @Header('Cache-Control', 'no-store')
  async correct(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<ClientAcquisitionDto> {
    const id = requireId(clientId, 'Client');
    const parsed = parseCorrectClientAcquisition(body);
    if (!parsed.success) {
      throw invalidRequest('A correction needs one of the eight channels');
    }
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.correctClient(
        { clientId: id, ...parsed.data },
        principal,
      ),
    );
  }
}

// BKM-011 (AW24): a Trainer's personal Referral Code, Administrator only.
@Controller({ path: 'administrator/staff-members', version: '1' })
@ApiBearerAuth()
export class AdministratorTrainerReferralCodeController extends AcquisitionController {
  @Get(':staffMemberId/referral-code')
  @ApiOperation({ operationId: 'getStaffMemberReferralCode' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiOkResponse({ type: TrainerReferralCodeDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainerReferralCodeDto> {
    const id = requireId(staffMemberId, 'Staff Member');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.readTrainerCode({ staffMemberId: id }, principal),
    );
  }

  @Put(':staffMemberId/referral-code')
  @ApiOperation({ operationId: 'setStaffMemberReferralCode' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiBody({ type: SetTrainerReferralCodeDto })
  @ApiOkResponse({ type: TrainerReferralCodeDto })
  @Header('Cache-Control', 'no-store')
  async set(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<TrainerReferralCodeDto> {
    const id = requireId(staffMemberId, 'Staff Member');
    const parsed = parseSetTrainerReferralCode(body);
    if (!parsed.success) {
      throw invalidRequest('Send a referralCode, or null to remove it');
    }
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.setTrainerCode(
        { staffMemberId: id, referralCode: parsed.data.referralCode },
        principal,
      ),
    );
  }
}
