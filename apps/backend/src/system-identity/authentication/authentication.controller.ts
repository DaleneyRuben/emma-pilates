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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  AuthenticationSessionCredentialDto,
  ClientAuthenticationIdentityDto,
  CreateAuthenticationSessionDto,
  CurrentAuthenticationPrincipalDto,
  parseCreateAuthenticationSession,
  StaffAuthenticationIdentityDto,
} from './authentication.dto';
import { toImpersonationDto } from '../impersonation/impersonation.dto';
import type { LoginCommand } from './login';
import { toLoginProblem } from './login-problems';
import type { AuthenticatedPrincipal } from './resolve-authenticated-principal';
import { AuthenticationRequiredError } from './resolve-authenticated-principal';
import {
  parseClientIdentifier,
  requestNetworkAddress,
} from '../security/request-source';

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

const parseBearerCredential = (authorization: string | undefined): string => {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '');

  if (match?.[1] === undefined) {
    throw new UnauthorizedException('Authentication is required');
  }

  return match[1];
};

@Controller({ path: 'authentication-sessions', version: '1' })
@ApiExtraModels(ClientAuthenticationIdentityDto, StaffAuthenticationIdentityDto)
export class AuthenticationController {
  constructor(
    @Inject(mobileLogin) private readonly loginHandler: MobileLoginHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
    @Inject(currentSessionLogout) private readonly logoutHandler: LogoutHandler,
  ) {}

  @Post()
  @ApiOperation({ operationId: 'createMobileAuthenticationSession' })
  @ApiHeader({
    name: 'x-client-identifier',
    required: false,
    description: 'Random first-party app installation identifier',
  })
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
        networkAddress: requestNetworkAddress(request),
      });
    } catch (error) {
      throw toLoginProblem(error, response);
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

    return {
      accountId: principal.accountId,
      identity: principal.identity,
      ...(principal.impersonation === undefined ||
      principal.identity.kind !== 'staff' ||
      principal.identity.role === 'administrator'
        ? {}
        : {
            impersonation: toImpersonationDto({
              id: principal.impersonation.id,
              staffMemberId: principal.identity.staffMemberId,
              staffMemberName: principal.impersonation.staffMemberName,
              role: principal.identity.role,
              expiresAt: principal.impersonation.expiresAt,
            }),
          }),
    };
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
