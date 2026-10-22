import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../authentication/authentication.controller';
import {
  authenticateBearer,
  parseRequestCredential,
  type PrincipalResolver,
} from '../authentication/bearer-principal';
import type { AuthenticationSurface } from '../authentication/create-authentication-session';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  ImpersonationError,
  type ImpersonationErrorCode,
  type ImpersonationView,
} from './impersonation';
import {
  ImpersonationDto,
  parseStartImpersonation,
  StartImpersonationDto,
  toImpersonationDto,
} from './impersonation.dto';

export const impersonationOperations = Symbol('impersonationOperations');

export type ImpersonationOperations = {
  start(
    command: { staffMemberId: string; surface: AuthenticationSurface },
    principal: AuthenticatedPrincipal,
  ): Promise<ImpersonationView>;
  end(principal: AuthenticatedPrincipal): Promise<void>;
};

const statuses: Record<ImpersonationErrorCode, number> = {
  staff_access_denied: HttpStatus.FORBIDDEN,
  impersonation_surface: HttpStatus.FORBIDDEN,
  impersonation_active: HttpStatus.CONFLICT,
  impersonation_not_active: HttpStatus.NOT_FOUND,
  staff_member_not_found: HttpStatus.NOT_FOUND,
  staff_member_not_impersonable: HttpStatus.CONFLICT,
};

const details: Record<ImpersonationErrorCode, string> = {
  staff_access_denied: 'Impersonation is limited to Administrators',
  impersonation_surface: 'Impersonation starts only from the Staff app',
  impersonation_active: 'This session already sees the app as someone',
  impersonation_not_active: 'This session is not seeing the app as anyone',
  staff_member_not_found: 'Staff Member not found',
  staff_member_not_impersonable:
    'Only an active Trainer, Assistant, or Nutritionist can be seen as',
};

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ImpersonationError) {
      throw new HttpException(
        { code: error.code, detail: details[error.code] },
        statuses[error.code],
      );
    }
    throw error;
  }
};

// FUT-001 / ADR-0100: an Administrator starts and ends seeing the Staff app as
// a Staff Member. Personal data, so nothing is cached (ADR-0063).
@Controller({ path: 'impersonations', version: '1' })
@ApiBearerAuth()
export class ImpersonationController {
  constructor(
    @Inject(impersonationOperations)
    private readonly operations: ImpersonationOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post()
  @ApiOperation({ operationId: 'startImpersonation' })
  @ApiBody({ type: StartImpersonationDto })
  @ApiCreatedResponse({ type: ImpersonationDto })
  @Header('Cache-Control', 'no-store')
  async start(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<ImpersonationDto> {
    const parsed = parseStartImpersonation(body);
    if (parsed === null) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid Staff Member identifier',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    const { surface } = parseRequestCredential(authorization);
    return toImpersonationDto(
      await run(() => this.operations.start({ ...parsed, surface }, principal)),
    );
  }

  @Delete('current')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'endCurrentImpersonation' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async end(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    await run(() => this.operations.end(principal));
  }
}
