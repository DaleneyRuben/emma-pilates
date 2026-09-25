import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  EmailChangeError,
  type completeEmailChange,
  type readPendingEmailChange,
  type requestEmailChange,
  type resendEmailChange,
} from './email-change';
import {
  CompleteEmailChangeDto,
  EmailChangeCompletionResultDto,
  EmailChangeRequestResultDto,
  EmailChangeResendResultDto,
  parseEmailChangeCompletion,
  parseEmailChangeRequest,
  PendingEmailChangeStateDto,
  RequestEmailChangeDto,
} from './email-change.dto';

export const emailChangeOperations = Symbol('emailChangeOperations');

export type EmailChangeOperations = {
  request: (
    command: { email: string },
    principal: AuthenticatedPrincipal,
  ) => ReturnType<typeof requestEmailChange>;
  resend: (
    principal: AuthenticatedPrincipal,
  ) => ReturnType<typeof resendEmailChange>;
  cancel: (principal: AuthenticatedPrincipal) => Promise<void>;
  readPending: (
    principal: AuthenticatedPrincipal,
  ) => ReturnType<typeof readPendingEmailChange>;
  complete: (command: {
    token: string;
  }) => ReturnType<typeof completeEmailChange>;
};

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof EmailChangeError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    throw error;
  }
};

// IDN-008: the signed-in Account's pending email change (Client 22) and the
// public completion of its link. Nothing here is cached (ADR-0063).
@Controller({ version: '1' })
export class EmailChangeController {
  constructor(
    @Inject(emailChangeOperations)
    private readonly operations: EmailChangeOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post('accounts/current/email-change')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'requestCurrentAccountEmailChange' })
  @ApiBody({ type: RequestEmailChangeDto })
  @ApiAcceptedResponse({ type: EmailChangeRequestResultDto })
  @Header('Cache-Control', 'no-store')
  async request(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<EmailChangeRequestResultDto> {
    const parsed = parseEmailChangeRequest(body);
    if (!parsed.success) throw invalidRequest('Invalid email change request');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.request(parsed.data, principal));
  }

  @Get('accounts/current/email-change')
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'getCurrentAccountEmailChange' })
  @ApiOkResponse({ type: PendingEmailChangeStateDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PendingEmailChangeStateDto> {
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.readPending(principal));
  }

  @Post('accounts/current/email-change/resends')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'resendCurrentAccountEmailChange' })
  @ApiAcceptedResponse({ type: EmailChangeResendResultDto })
  @Header('Cache-Control', 'no-store')
  async resend(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<EmailChangeResendResultDto> {
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.resend(principal));
  }

  @Delete('accounts/current/email-change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'cancelCurrentAccountEmailChange' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const principal = await this.authenticate(authorization);
    await run(() => this.operations.cancel(principal));
  }

  // Opened from the link sent to the new address; no session involved.
  @Post('email-changes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'completeEmailChange' })
  @ApiBody({ type: CompleteEmailChangeDto })
  @ApiOkResponse({ type: EmailChangeCompletionResultDto })
  @Header('Cache-Control', 'no-store')
  async complete(
    @Body() body: unknown,
  ): Promise<EmailChangeCompletionResultDto> {
    const parsed = parseEmailChangeCompletion(body);
    if (!parsed.success) throw invalidRequest('Invalid email change link');
    return run(() => this.operations.complete(parsed.data));
  }

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}
