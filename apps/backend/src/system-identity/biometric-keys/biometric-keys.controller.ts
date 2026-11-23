import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOperation,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { authenticatedPrincipalResolver } from '../authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../authentication/bearer-principal';
import { LoginThrottledError } from '../authentication/login';
import { refuseWhileImpersonating } from '../authentication/refuse-while-impersonating';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  parseClientIdentifier,
  requestNetworkAddress,
} from '../security/request-source';
import { tooManyRequests } from '../security/too-many-requests';
import {
  BiometricKeyRejectedError,
  MissingInstallationError,
  type exchangeBiometricKey,
  type issueBiometricKey,
  type revokeBiometricKey,
} from './biometric-keys';
import {
  BiometricKeyDto,
  BiometricKeyExchangeDto,
  ExchangeBiometricKeyDto,
  parseExchangeBiometricKey,
  parseRevokeBiometricKey,
  RevokeBiometricKeyDto,
} from './biometric-keys.dto';

export const biometricKeyOperations = Symbol('biometricKeyOperations');

export type BiometricKeyOperations = {
  issue: (
    principal: AuthenticatedPrincipal,
    command: { clientIdentifier: string | null },
  ) => ReturnType<typeof issueBiometricKey>;
  exchange: (
    command: Parameters<typeof exchangeBiometricKey>[0],
  ) => ReturnType<typeof exchangeBiometricKey>;
  revoke: (
    command: Parameters<typeof revokeBiometricKey>[0],
  ) => ReturnType<typeof revokeBiometricKey>;
};

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

const installationHeader = {
  name: 'x-client-identifier',
  required: true,
  description: 'Random first-party app installation identifier',
} as const;

const toProblem = (error: unknown, response: Response): unknown => {
  if (error instanceof MissingInstallationError) {
    return invalidRequest('The installation identifier is required');
  }
  if (error instanceof BiometricKeyRejectedError) {
    return new HttpException(
      {
        code: 'biometric_key_invalid',
        detail: 'Sign in with your email and password',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
  if (error instanceof LoginThrottledError) {
    return tooManyRequests(response, error.retryAfterSeconds, {
      code: 'login_throttled',
      detail: 'Login is temporarily unavailable. Try again later',
    });
  }
  return error;
};

// MOB-006 / ADR-0112: fingerprint or Face ID sign-in for one installation.
// Nothing here is cached (ADR-0063).
@Controller({ path: 'biometric-keys', version: '1' })
export class BiometricKeysController {
  constructor(
    @Inject(biometricKeyOperations)
    private readonly operations: BiometricKeyOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'issueBiometricKey' })
  @ApiHeader(installationHeader)
  @ApiCreatedResponse({ type: BiometricKeyDto })
  @Header('Cache-Control', 'no-store')
  async issue(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-client-identifier') clientIdentifier: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BiometricKeyDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    refuseWhileImpersonating(principal);

    try {
      return await this.operations.issue(principal, {
        clientIdentifier: parseClientIdentifier(clientIdentifier),
      });
    } catch (error) {
      throw toProblem(error, response);
    }
  }

  @Post('exchange')
  @ApiOperation({ operationId: 'exchangeBiometricKey' })
  @ApiHeader(installationHeader)
  @ApiBody({ type: ExchangeBiometricKeyDto })
  @ApiCreatedResponse({ type: BiometricKeyExchangeDto })
  @Header('Cache-Control', 'no-store')
  async exchange(
    @Body() body: unknown,
    @Headers('x-client-identifier') clientIdentifier: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BiometricKeyExchangeDto> {
    const parsed = parseExchangeBiometricKey(body);
    if (!parsed.success) throw invalidRequest('Invalid biometric key');

    try {
      return await this.operations.exchange({
        ...parsed.data,
        clientIdentifier: parseClientIdentifier(clientIdentifier),
        networkAddress: requestNetworkAddress(request),
      });
    } catch (error) {
      throw toProblem(error, response);
    }
  }

  // Perfil's switch turned off, or «Usar otra cuenta»: always 204, so the
  // answer never tells whether the key existed.
  @Post('revocation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'revokeBiometricKey' })
  @ApiHeader(installationHeader)
  @ApiBody({ type: RevokeBiometricKeyDto })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async revoke(
    @Body() body: unknown,
    @Headers('x-client-identifier') clientIdentifier: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const parsed = parseRevokeBiometricKey(body);
    if (!parsed.success) throw invalidRequest('Invalid biometric key');

    try {
      await this.operations.revoke({
        ...parsed.data,
        clientIdentifier: parseClientIdentifier(clientIdentifier),
      });
    } catch (error) {
      throw toProblem(error, response);
    }
  }
}
