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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { z } from 'zod';
import { authenticatedPrincipalResolver } from '../authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  ClientInvitationNotFoundError,
  InvitationAccessDeniedError,
  InvitationEmailInUseError,
  InvitationEmailThrottledError,
  InvitationHasActivityError,
  type ClientInvitationView,
  type InviteClientResult,
} from './client-invitations';
import {
  ClientInvitationDto,
  ClientInvitationResultDto,
  CorrectInvitationEmailDto,
  InviteClientDto,
  parseCorrectInvitationEmail,
  parseInviteClient,
} from './client-invitations.dto';

export const clientInvitationOperations = Symbol('clientInvitationOperations');

export type ClientInvitationOperations = {
  invite: (
    command: { name: string; email: string; phone: string | null },
    principal: AuthenticatedPrincipal,
  ) => Promise<InviteClientResult>;
  read: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<ClientInvitationView>;
  correctEmail: (
    command: { clientId: string; email: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<ClientInvitationView>;
  resend: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<ClientInvitationView>;
  cancel: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<void>;
};

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

const uuid = z.uuid();

const requireClientId = (value: string): string => {
  const result = uuid.safeParse(value);
  if (!result.success) throw invalidRequest('Invalid Client identifier');
  return result.data;
};

// Every invitation rule has a stable code; the status follows the rule.
const problems: [new () => Error, string, HttpStatus][] = [
  [InvitationAccessDeniedError, 'access_denied', HttpStatus.FORBIDDEN],
  [
    ClientInvitationNotFoundError,
    'client_invitation_not_found',
    HttpStatus.NOT_FOUND,
  ],
  [InvitationEmailInUseError, 'email_in_use', HttpStatus.CONFLICT],
  [
    InvitationEmailThrottledError,
    'email_throttled',
    HttpStatus.TOO_MANY_REQUESTS,
  ],
  [InvitationHasActivityError, 'invitation_has_activity', HttpStatus.CONFLICT],
];

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    const match = problems.find(([type]) => error instanceof type);
    if (match !== undefined && error instanceof Error) {
      throw new HttpException(
        { code: match[1], detail: error.message },
        match[2],
      );
    }
    throw error;
  }
};

@Controller({ path: 'assistant/client-invitations', version: '1' })
@ApiBearerAuth()
export class AssistantClientInvitationsController {
  constructor(
    @Inject(clientInvitationOperations)
    private readonly operations: ClientInvitationOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: 'inviteClient' })
  @ApiBody({ type: InviteClientDto })
  @ApiCreatedResponse({ type: ClientInvitationResultDto })
  @Header('Cache-Control', 'no-store')
  async invite(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<ClientInvitationResultDto> {
    const parsed = parseInviteClient(body);
    if (parsed === null) {
      throw invalidRequest(
        'Invitation needs a name, a valid email, and an optional phone',
      );
    }
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.invite(parsed, principal));
  }

  @Get(':clientId')
  @ApiOperation({ operationId: 'getClientInvitation' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: ClientInvitationDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClientInvitationDto> {
    const id = requireClientId(clientId);
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.read({ clientId: id }, principal));
  }

  @Post(':clientId/email-corrections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'correctClientInvitationEmail' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiBody({ type: CorrectInvitationEmailDto })
  @ApiOkResponse({ type: ClientInvitationDto })
  @Header('Cache-Control', 'no-store')
  async correctEmail(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<ClientInvitationDto> {
    const id = requireClientId(clientId);
    const parsed = parseCorrectInvitationEmail(body);
    if (parsed === null) throw invalidRequest('A valid email is required');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.correctEmail(
        { clientId: id, email: parsed.email },
        principal,
      ),
    );
  }

  @Post(':clientId/resends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'resendClientInvitation' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: ClientInvitationDto })
  @Header('Cache-Control', 'no-store')
  async resend(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClientInvitationDto> {
    const id = requireClientId(clientId);
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.resend({ clientId: id }, principal));
  }

  @Post(':clientId/cancellation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'cancelClientInvitation' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireClientId(clientId);
    const principal = await this.authenticate(authorization);
    await run(() => this.operations.cancel({ clientId: id }, principal));
  }
}
