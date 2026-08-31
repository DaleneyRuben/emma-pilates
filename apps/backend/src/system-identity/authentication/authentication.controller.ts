import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthenticationFailedError } from './authenticate-credentials';
import {
  AuthenticationSessionCredentialDto,
  CreateAuthenticationSessionDto,
  CurrentAuthenticationPrincipalDto,
  parseCreateAuthenticationSession,
} from './authentication.dto';
import type { LoginCommand } from './login';
import { LoginThrottledError } from './login';
import type { AuthenticatedPrincipal } from './resolve-authenticated-principal';
import { AuthenticationRequiredError } from './resolve-authenticated-principal';

export const mobileLogin = Symbol('mobileLogin');
export const authenticatedPrincipalResolver = Symbol(
  'authenticatedPrincipalResolver',
);
export const currentSessionLogout = Symbol('currentSessionLogout');

type MobileLoginHandler = (
  command: LoginCommand,
) => Promise<AuthenticationSessionCredentialDto>;
type PrincipalResolver = (
  credential: string,
  meaningfulActivity: boolean,
) => Promise<AuthenticatedPrincipal>;
type LogoutHandler = (authenticationSessionId: string) => Promise<void>;

const clientIdentifierPattern = /^[A-Za-z0-9_-]{16,128}$/;

const parseClientIdentifier = (value: unknown): string | null =>
  typeof value === 'string' && clientIdentifierPattern.test(value)
    ? value
    : null;

const parseBearerCredential = (authorization: string | undefined): string => {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '');

  if (match?.[1] === undefined) {
    throw new UnauthorizedException('Authentication is required');
  }

  return match[1];
};

const authenticationProblem = (
  status: number,
  code: string,
  detail: string,
): HttpException => new HttpException({ code, detail }, status);

@Controller({ path: 'authentication-sessions', version: '1' })
export class AuthenticationController {
  constructor(
    @Inject(mobileLogin) private readonly loginHandler: MobileLoginHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
    @Inject(currentSessionLogout) private readonly logoutHandler: LogoutHandler,
  ) {}

  @Post()
  @ApiOperation({ operationId: 'createMobileAuthenticationSession' })
  @ApiCreatedResponse({ type: AuthenticationSessionCredentialDto })
  async login(
    @Body() body: CreateAuthenticationSessionDto,
    @Headers('x-client-identifier') clientIdentifier: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationSessionCredentialDto> {
    const credentials = parseCreateAuthenticationSession(body);

    if (credentials === null) {
      throw new BadRequestException('Invalid Login request');
    }

    try {
      return await this.loginHandler({
        ...credentials,
        clientIdentifier: parseClientIdentifier(clientIdentifier),
        networkAddress: request.ip ?? request.socket.remoteAddress ?? 'unknown',
      });
    } catch (error) {
      if (error instanceof AuthenticationFailedError) {
        throw authenticationProblem(
          HttpStatus.UNAUTHORIZED,
          'authentication_failed',
          'Email or password is incorrect',
        );
      }

      if (error instanceof LoginThrottledError) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds));
        throw authenticationProblem(
          HttpStatus.TOO_MANY_REQUESTS,
          'login_throttled',
          'Login is temporarily unavailable. Try again later',
        );
      }

      throw error;
    }
  }

  @Get('current')
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'getCurrentAuthenticationSession' })
  @ApiOkResponse({ type: CurrentAuthenticationPrincipalDto })
  async current(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<CurrentAuthenticationPrincipalDto> {
    const principal = await this.resolvePrincipal(authorization);

    return { accountId: principal.accountId, identity: principal.identity };
  }

  @Delete('current')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'logoutCurrentAuthenticationSession' })
  @ApiNoContentResponse()
  async logout(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const principal = await this.resolvePrincipal(authorization);
    await this.logoutHandler(principal.authenticationSessionId);
  }

  private async resolvePrincipal(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      ) {
        throw new UnauthorizedException('Authentication is required');
      }

      throw error;
    }
  }
}
