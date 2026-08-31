import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiAcceptedResponse, ApiOperation } from '@nestjs/swagger';
import {
  CorrectPendingClientEmailDto,
  PendingEmailCorrectionDto,
  PendingClientRegistrationDto,
  parseCorrectPendingClientEmail,
  parseStartClientRegistration,
  StartClientRegistrationDto,
} from './client-registration.dto';
import { CorrectPendingClientEmail } from './correct-pending-client-email';
import { RegisterClient } from './register-client';

@Controller({ path: 'client-registrations', version: '1' })
export class ClientRegistrationController {
  constructor(
    @Inject(RegisterClient)
    private readonly registerClient: RegisterClient,
    @Inject(CorrectPendingClientEmail)
    private readonly correctPendingClientEmail: CorrectPendingClientEmail,
  ) {}

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

    const result = await this.registerClient.execute(command);

    return {
      status: 'verification_required',
      ...result,
    };
  }
}
