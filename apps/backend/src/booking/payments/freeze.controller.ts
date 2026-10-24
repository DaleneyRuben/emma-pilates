import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import { parseUuid } from '../booking.dto';
import { AdministrationError } from '../administration/administration-errors';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { FreezeAccessDeniedError } from './decide-freeze';
import {
  DecideFreezeDto,
  FreezeDecisionDto,
  FreezeRequestDto,
  FreezeReviewDto,
  parseDecideFreeze,
  parseRequestFreeze,
  RequestFreezeDto,
} from './freeze.dto';
import { PaymentRuleError } from './payment-errors';
import { paymentCommands } from './payments.controller';
import type { PaymentCommands } from './prisma-payment-commands';

const invalidRequest = (detail: string) =>
  new HttpException(
    { code: 'invalid_request', detail },
    HttpStatus.BAD_REQUEST,
  );

const requireId = (value: string, detail: string): string => {
  const parsed = parseUuid(value);
  if (parsed === null) throw invalidRequest(detail);
  return parsed;
};

const asFreezeProblem = (error: unknown): HttpException | null => {
  if (error instanceof PaymentRuleError) {
    return new HttpException(
      { code: error.code, detail: error.message },
      error.status,
    );
  }
  if (
    error instanceof FreezeAccessDeniedError ||
    error instanceof BookingAccessDeniedError ||
    error instanceof AdministrationError
  ) {
    return new ForbiddenException({
      code: 'freeze_access_denied',
      detail: 'Freeze access is denied',
    });
  }
  return null;
};

const runFreeze = async <Result>(
  work: () => Promise<Result>,
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    const problem = asFreezeProblem(error);
    if (problem !== null) throw problem;
    throw error;
  }
};

@Controller({ path: 'freezes', version: '1' })
@ApiBearerAuth()
export class ClientFreezesController {
  constructor(
    @Inject(paymentCommands) private readonly commands: PaymentCommands,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post()
  @ApiOperation({ operationId: 'requestFreeze' })
  @ApiBody({ type: RequestFreezeDto })
  @ApiCreatedResponse({ type: FreezeRequestDto })
  @Header('Cache-Control', 'no-store')
  async request(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<FreezeRequestDto> {
    const parsed = parseRequestFreeze(body);
    if (parsed === null) throw invalidRequest('Invalid Freeze request');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runFreeze(() => this.commands.requestFreeze(parsed, principal));
  }
}

@Controller({ path: 'administrator/freezes', version: '1' })
@ApiBearerAuth()
export class AdministratorFreezesController {
  constructor(
    @Inject(paymentCommands) private readonly commands: PaymentCommands,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listRequestedFreezes' })
  @ApiOkResponse({ type: FreezeReviewDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async requested(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<FreezeReviewDto[]> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runFreeze(() => this.commands.listRequestedFreezes(principal));
  }

  @Get(':freezeId')
  @ApiOperation({ operationId: 'getFreezeReview' })
  @ApiParam({ name: 'freezeId', format: 'uuid' })
  @ApiOkResponse({ type: FreezeReviewDto })
  @Header('Cache-Control', 'no-store')
  async review(
    @Param('freezeId') freezeId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<FreezeReviewDto> {
    const id = requireId(freezeId, 'Invalid Freeze identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runFreeze(() =>
      this.commands.readFreezeReview({ freezeId: id }, principal),
    );
  }

  @Post(':freezeId/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'decideFreeze' })
  @ApiParam({ name: 'freezeId', format: 'uuid' })
  @ApiBody({ type: DecideFreezeDto })
  @ApiOkResponse({ type: FreezeDecisionDto })
  @Header('Cache-Control', 'no-store')
  async decide(
    @Param('freezeId') freezeId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<FreezeDecisionDto> {
    const id = requireId(freezeId, 'Invalid Freeze identifier');
    const parsed = parseDecideFreeze(body);
    if (parsed === null) throw invalidRequest('Invalid Freeze decision');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runFreeze(() =>
      this.commands.decideFreeze(
        { freezeId: id, decision: parsed.decision },
        principal,
      ),
    );
  }
}
