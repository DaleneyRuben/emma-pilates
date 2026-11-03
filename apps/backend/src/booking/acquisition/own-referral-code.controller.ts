import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  Inject,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { acquisitionProblem } from './acquisition-errors';
import type {
  OwnReferralCodeView,
  ReferralCodeAvailability,
} from './own-referral-code';
import {
  ChangeOwnReferralCodeDto,
  OwnReferralCodeDto,
  parseAvailabilityQuery,
  parseChangeOwnReferralCode,
  ReferralCodeAvailabilityDto,
} from './own-referral-code.dto';

export const ownReferralCodeOperations = Symbol('ownReferralCodeOperations');

type Principal = AuthenticatedPrincipal;

export type OwnReferralCodeOperations = {
  read: (principal: Principal) => Promise<OwnReferralCodeView>;
  change: (
    command: { referralCode: string },
    principal: Principal,
  ) => Promise<OwnReferralCodeView>;
  checkAvailability: (
    command: { code: string },
    principal: Principal,
  ) => Promise<ReferralCodeAvailability>;
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

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

// BKM-017: a Client («Invita a una amiga») or a Trainer (Staff «Perfil»)
// edits her own Referral Code. Personal data, so nothing is cached.
@Controller({ path: 'referral-codes', version: '1' })
@ApiBearerAuth()
export class OwnReferralCodeController {
  constructor(
    @Inject(ownReferralCodeOperations)
    private readonly operations: OwnReferralCodeOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get('current')
  @ApiOperation({ operationId: 'getOwnReferralCode' })
  @ApiOkResponse({ type: OwnReferralCodeDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<OwnReferralCodeDto> {
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.read(principal));
  }

  @Put('current')
  @ApiOperation({ operationId: 'changeOwnReferralCode' })
  @ApiBody({ type: ChangeOwnReferralCodeDto })
  @ApiOkResponse({ type: OwnReferralCodeDto })
  @Header('Cache-Control', 'no-store')
  async change(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<OwnReferralCodeDto> {
    const parsed = parseChangeOwnReferralCode(body);
    if (!parsed.success) throw invalidRequest('Send the new referralCode');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.change(parsed.data, principal));
  }

  @Get('availability')
  @ApiOperation({ operationId: 'getReferralCodeAvailability' })
  @ApiQuery({ name: 'code', type: String })
  @ApiOkResponse({ type: ReferralCodeAvailabilityDto })
  @Header('Cache-Control', 'no-store')
  async availability(
    @Headers('authorization') authorization: string | undefined,
    @Query('code') code: unknown,
  ): Promise<ReferralCodeAvailabilityDto> {
    const parsed = parseAvailabilityQuery(code);
    if (!parsed.success) throw invalidRequest('Send the code to check');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.checkAvailability({ code: parsed.data }, principal),
    );
  }
}
