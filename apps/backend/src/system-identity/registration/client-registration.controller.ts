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
import { referralProblem } from '../../booking/payments/referral-attribution';
import {
  ApiAcceptedResponse,
  ApiNoContentResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CancelPendingClientRegistration } from './cancel-pending-client-registration';
import {
  CorrectPendingClientEmailDto,
  PendingEmailCorrectionDto,
  PendingClientRegistrationDto,
  PendingRegistrationContinuationDto,
  PendingVerificationResendDto,
  parseCorrectPendingClientEmail,
  parsePendingRegistrationContinuation,
  parseStartClientRegistration,
  StartClientRegistrationDto,
} from './client-registration.dto';
import { CorrectPendingClientEmail } from './correct-pending-client-email';
import { RegisterClient } from './register-client';
import { ResendPendingClientVerification } from './resend-pending-client-verification';

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
  ) {}

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
      const problem = referralProblem(error);
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
