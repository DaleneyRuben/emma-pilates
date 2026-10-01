import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CompletePasswordRecoveryDto } from '../account-security/account-security.dto';
import { parsePasswordLink } from '../account-security/account-security.dto';
import {
  authenticatedPrincipalResolver,
  currentSessionLogout,
} from '../authentication/authentication.controller';
import {
  ClientAuthenticationIdentityDto,
  CreateAuthenticationSessionDto,
  CurrentAuthenticationPrincipalDto,
  parseCreateAuthenticationSession,
  StaffAuthenticationIdentityDto,
} from '../authentication/authentication.dto';
import {
  authenticateBearer,
  parseRequestCredential,
  type PrincipalResolver,
} from '../authentication/bearer-principal';
import type { LoginCommand } from '../authentication/login';
import { toLoginProblem } from '../authentication/login-problems';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  browserClientIdentifier,
  clearSessionCookie,
  setSessionCookie,
} from './admin-web-cookies';
import { requestNetworkAddress } from '../security/request-source';
import { AdminWebPasswordRecoveryResultDto } from './admin-web-session.dto';

export const adminWebLogin = Symbol('adminWebLogin');
export const adminWebPasswordRecoveryCompletion = Symbol(
  'adminWebPasswordRecoveryCompletion',
);
export const adminWebSessionSecurity = 'adminWebSession';

type LoginHandler = (command: LoginCommand) => Promise<{ credential: string }>;
type LogoutHandler = (authenticationSessionId: string) => Promise<void>;
type RecoveryHandler = (command: {
  token: string;
  password: string;
}) => Promise<{
  status: 'recovered' | 'expired' | 'invalid';
  credential?: string;
}>;

const toPrincipalDto = (
  principal: AuthenticatedPrincipal,
): CurrentAuthenticationPrincipalDto => ({
  accountId: principal.accountId,
  identity: principal.identity,
});

/**
 * The admin web's browser session (ADR-0084): the same Login, principal
 * resolution, and recovery use cases as mobile, but the credential lives
 * only in a host-only HttpOnly cookie and only an Administrator may hold one.
 */
@Controller({ path: 'admin-web', version: '1' })
@ApiExtraModels(ClientAuthenticationIdentityDto, StaffAuthenticationIdentityDto)
export class AdminWebSessionController {
  constructor(
    @Inject(adminWebLogin) private readonly loginHandler: LoginHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
    @Inject(currentSessionLogout) private readonly logoutHandler: LogoutHandler,
    @Inject(adminWebPasswordRecoveryCompletion)
    private readonly recoveryHandler: RecoveryHandler,
  ) {}

  @Post('authentication-sessions')
  @ApiOperation({ operationId: 'createAdminWebAuthenticationSession' })
  @ApiCreatedResponse({ type: CurrentAuthenticationPrincipalDto })
  async login(
    @Body() body: CreateAuthenticationSessionDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentAuthenticationPrincipalDto> {
    const credentials = parseCreateAuthenticationSession(body);
    if (credentials === null) {
      throw new BadRequestException('Invalid Login request');
    }

    let credential: string;
    try {
      ({ credential } = await this.loginHandler({
        ...credentials,
        clientIdentifier: browserClientIdentifier(
          request.headers.cookie,
          response,
        ),
        networkAddress: requestNetworkAddress(request),
        surface: 'admin_web',
      }));
    } catch (error) {
      throw toLoginProblem(error, response);
    }

    setSessionCookie(response, credential);
    return toPrincipalDto(
      await this.principalResolver(credential, false, 'admin_web'),
    );
  }

  @Get('authentication-sessions/current')
  @ApiCookieAuth(adminWebSessionSecurity)
  @ApiOperation({ operationId: 'getCurrentAdminWebAuthenticationSession' })
  @ApiOkResponse({ type: CurrentAuthenticationPrincipalDto })
  async current(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<CurrentAuthenticationPrincipalDto> {
    if (parseRequestCredential(authorization).surface !== 'admin_web') {
      throw new UnauthorizedException('Authentication is required');
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    // A browser session outlives no demotion: once the Staff Member is no
    // longer an Administrator the admin web treats it as signed out.
    if (
      principal.identity.kind !== 'staff' ||
      principal.identity.role !== 'administrator'
    ) {
      throw new UnauthorizedException('Authentication is required');
    }
    return toPrincipalDto(principal);
  }

  @Delete('authentication-sessions/current')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(adminWebSessionSecurity)
  @ApiOperation({ operationId: 'logoutAdminWebAuthenticationSession' })
  @ApiNoContentResponse()
  async logout(
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    clearSessionCookie(response);
    let principal: AuthenticatedPrincipal;
    try {
      if (parseRequestCredential(authorization).surface !== 'admin_web') {
        return;
      }
      principal = await authenticateBearer(
        this.principalResolver,
        authorization,
        false,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) return;
      throw error;
    }
    await this.logoutHandler(principal.authenticationSessionId);
  }

  @Post('password-recoveries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'completeAdminWebPasswordRecovery' })
  @ApiOkResponse({ type: AdminWebPasswordRecoveryResultDto })
  async recoverPassword(
    @Body() body: CompletePasswordRecoveryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminWebPasswordRecoveryResultDto> {
    const parsed = parsePasswordLink(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid password recovery');
    }

    const result = await this.recoveryHandler(parsed.data);
    if (result.credential !== undefined) {
      setSessionCookie(response, result.credential);
    }
    return {
      status: result.status,
      signedIn: result.credential !== undefined,
    };
  }
}
