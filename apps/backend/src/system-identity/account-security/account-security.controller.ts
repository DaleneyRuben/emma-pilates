import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import type { AuthenticationLinkInspection } from './authentication-links';
import { CurrentPasswordIncorrectError } from './change-password';
import {
  AccountActivationResultDto,
  AuthenticationLinkInspectionDto,
  AuthenticationLinkTokenDto,
  ChangeCurrentPasswordDto,
  CompleteAccountActivationDto,
  CompletePasswordRecoveryDto,
  parseAuthenticationLinkToken,
  parsePasswordChange,
  parsePasswordLink,
  parseRecoveryRequest,
  PasswordRecoveryRequestResultDto,
  PasswordRecoveryResultDto,
  RequestPasswordRecoveryDto,
  toAuthenticationLinkInspectionDto,
} from './account-security.dto';
import { authenticatedPrincipalResolver } from '../authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../authentication/bearer-principal';

export const authenticationLinkInspection = Symbol(
  'authenticationLinkInspection',
);
export const accountActivation = Symbol('accountActivation');
export const passwordRecoveryRequest = Symbol('passwordRecoveryRequest');
export const passwordRecoveryCompletion = Symbol('passwordRecoveryCompletion');
export const currentPasswordChange = Symbol('currentPasswordChange');

type LinkInspectionHandler = (
  token: string,
) => Promise<AuthenticationLinkInspection>;
type ActivationHandler = (command: {
  token: string;
  password: string;
}) => Promise<AccountActivationResultDto>;
type RecoveryRequestHandler = (command: {
  email: string;
}) => Promise<PasswordRecoveryRequestResultDto>;
type RecoveryCompletionHandler = (command: {
  token: string;
  password: string;
}) => Promise<PasswordRecoveryResultDto>;
type PasswordChangeHandler = (command: {
  accountId: string;
  authenticationSessionId: string;
  currentPassword: string;
  newPassword: string;
}) => Promise<void>;

@Controller({ version: '1' })
export class AccountSecurityController {
  constructor(
    @Inject(authenticationLinkInspection)
    private readonly inspectLink: LinkInspectionHandler,
    @Inject(accountActivation) private readonly activate: ActivationHandler,
    @Inject(passwordRecoveryRequest)
    private readonly requestRecovery: RecoveryRequestHandler,
    @Inject(passwordRecoveryCompletion)
    private readonly completeRecovery: RecoveryCompletionHandler,
    @Inject(currentPasswordChange)
    private readonly changePassword: PasswordChangeHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly resolvePrincipal: PrincipalResolver,
  ) {}

  @Post('authentication-links/inspection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'inspectAuthenticationLink' })
  @ApiOkResponse({ type: AuthenticationLinkInspectionDto })
  async inspect(
    @Body() body: AuthenticationLinkTokenDto,
  ): Promise<AuthenticationLinkInspectionDto> {
    const parsed = parseAuthenticationLinkToken(body);
    if (!parsed.success)
      throw new BadRequestException('Invalid authentication link inspection');
    return toAuthenticationLinkInspectionDto(
      await this.inspectLink(parsed.data.token),
    );
  }

  @Post('account-activations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'activateAccount' })
  @ApiOkResponse({ type: AccountActivationResultDto })
  async activateAccount(
    @Body() body: CompleteAccountActivationDto,
  ): Promise<AccountActivationResultDto> {
    const parsed = parsePasswordLink(body);
    if (!parsed.success)
      throw new BadRequestException('Invalid Account activation');
    return this.activate(parsed.data);
  }

  @Post('password-recovery-requests')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ operationId: 'requestPasswordRecovery' })
  @ApiAcceptedResponse({ type: PasswordRecoveryRequestResultDto })
  async requestPasswordRecovery(
    @Body() body: RequestPasswordRecoveryDto,
  ): Promise<PasswordRecoveryRequestResultDto> {
    const parsed = parseRecoveryRequest(body);
    if (!parsed.success)
      throw new BadRequestException('Invalid password recovery request');
    return this.requestRecovery(parsed.data);
  }

  @Post('password-recoveries')
  @ApiOperation({ operationId: 'completePasswordRecovery' })
  @ApiCreatedResponse({ type: PasswordRecoveryResultDto })
  async recoverPassword(
    @Body() body: CompletePasswordRecoveryDto,
  ): Promise<PasswordRecoveryResultDto> {
    const parsed = parsePasswordLink(body);
    if (!parsed.success)
      throw new BadRequestException('Invalid password recovery');
    return this.completeRecovery(parsed.data);
  }

  @Patch('accounts/current/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'changeCurrentAccountPassword' })
  @ApiNoContentResponse()
  async changeCurrentPassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: ChangeCurrentPasswordDto,
  ): Promise<void> {
    const parsed = parsePasswordChange(body);
    if (!parsed.success)
      throw new BadRequestException('Invalid password change');
    const principal = await this.authenticate(authorization);
    try {
      await this.changePassword({
        accountId: principal.accountId,
        authenticationSessionId: principal.authenticationSessionId,
        ...parsed.data,
      });
    } catch (error) {
      if (error instanceof CurrentPasswordIncorrectError) {
        throw new HttpException(
          {
            code: 'current_password_incorrect',
            detail: 'Current password is incorrect',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.resolvePrincipal, authorization);
  }
}
