import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { acquisitionProblem } from '../../booking/acquisition/acquisition-errors';
import { guestPassProblem } from '../../booking/payments/open-guest-pass';
import { referralProblem } from '../../booking/payments/referral-attribution';
import {
  ApiAcceptedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CancelPendingClientRegistration } from './cancel-pending-client-registration';
import {
  CorrectPendingClientEmailDto,
  PendingEmailCorrectionDto,
  PendingClientRegistrationDto,
  PendingRegistrationContinuationDto,
  PendingRegistrationStatusDto,
  PendingVerificationResendDto,
  parseCorrectPendingClientEmail,
  parsePendingRegistrationContinuation,
  parseStartClientRegistration,
  StartClientRegistrationDto,
} from './client-registration.dto';
import { EmailSourceBudget } from '../email-source-budget/email-source-budget.guard';
import { CorrectPendingClientEmail } from './correct-pending-client-email';
import { RegisterClient } from './register-client';
import { ResendPendingClientVerification } from './resend-pending-client-verification';

/** Reads a pending registration's status from its continuation (n.º 4). */
export const pendingRegistrationStatusReader = Symbol(
  'pendingRegistrationStatusReader',
);

type PendingRegistrationStatusReader = (
  registrationContinuation: string,
) => Promise<'pending' | 'verified' | 'expired' | 'bounced'>;

@Controller({ path: 'client-registrations', version: '1' })
export class ClientRegistrationController {
  constructor(
    @Inject(RegisterClient)
    private readonly registerClient: RegisterClient,
    @Inject(CorrectPendingClientEmail)
    private readonly correctPendingClientEmail: CorrectPendingClientEmail,
    @Inject(ResendPendingClientVerification)
    private readonly resendPendingClientVerification: ResendPendingClientVerification,
    @Inject(CancelPendingClientRegistration)
    private readonly cancelPendingClientRegistration: CancelPendingClientRegistration,
    @Inject(pendingRegistrationStatusReader)
    private readonly readStatus: PendingRegistrationStatusReader,
  ) {}

  // Walkthrough n.º 4 (C01c2): the registering phone asks whether its email
  // was confirmed meanwhile, then goes to Login instead of waiting.
  @Post('status-checks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'readPendingClientRegistrationStatus' })
  @ApiOkResponse({ type: PendingRegistrationStatusDto })
  async status(
    @Body() body: PendingRegistrationContinuationDto,
  ): Promise<PendingRegistrationStatusDto> {
    const command = parsePendingRegistrationContinuation(body);

    if (command === null) {
      throw new BadRequestException('Invalid registration status request');
    }

    return { status: await this.readStatus(command.registrationContinuation) };
  }

  @Post('cancellations')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'cancelPendingClientRegistration' })
  @ApiNoContentResponse()
  async cancel(
    @Body() body: PendingRegistrationContinuationDto,
  ): Promise<void> {
    const command = parsePendingRegistrationContinuation(body);

    if (command === null) {
      throw new BadRequestException(
        'Invalid pending registration cancellation request',
      );
    }

    await this.cancelPendingClientRegistration.execute(command);
  }

  @Post('verification-resends')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ operationId: 'resendPendingClientVerification' })
  @EmailSourceBudget('verification')
  @ApiAcceptedResponse({ type: PendingVerificationResendDto })
  async resendVerification(
    @Body() body: PendingRegistrationContinuationDto,
  ): Promise<PendingVerificationResendDto> {
    const command = parsePendingRegistrationContinuation(body);

    if (command === null) {
      throw new BadRequestException('Invalid verification resend request');
    }

    await this.resendPendingClientVerification.execute(command);

    return { status: 'verification_required' };
  }

  @Post('email-corrections')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ operationId: 'correctPendingClientEmail' })
  @EmailSourceBudget('verification')
  @ApiAcceptedResponse({ type: PendingEmailCorrectionDto })
  async correctEmail(
    @Body() body: CorrectPendingClientEmailDto,
  ): Promise<PendingEmailCorrectionDto> {
    const command = parseCorrectPendingClientEmail(body);

    if (command === null) {
      throw new BadRequestException('Invalid pending email correction request');
    }

    const result = await this.correctPendingClientEmail.execute(command);

    return {
      status: 'verification_required',
      email: result.email,
    };
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ operationId: 'registerClient' })
  @EmailSourceBudget('verification')
  @ApiAcceptedResponse({ type: PendingClientRegistrationDto })
  async register(
    @Body() body: StartClientRegistrationDto,
  ): Promise<PendingClientRegistrationDto> {
    const command = parseStartClientRegistration(body);

    if (command === null) {
      throw new BadRequestException('Invalid client registration request');
    }

    try {
      const result = await this.registerClient.execute(command);

      return {
        status: 'verification_required',
        ...result,
      };
    } catch (error) {
      const problem =
        referralProblem(error) ??
        acquisitionProblem(error) ??
        guestPassProblem(error);
      if (problem !== null) {
        throw new HttpException(
          { code: problem.code, detail: problem.detail },
          problem.status,
        );
      }
      throw error;
    }
  }
}
