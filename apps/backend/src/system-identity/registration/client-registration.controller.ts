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
  PendingClientRegistrationDto,
  parseStartClientRegistration,
  StartClientRegistrationDto,
} from './client-registration.dto';
import { RegisterClient } from './register-client';

@Controller({ path: 'client-registrations', version: '1' })
export class ClientRegistrationController {
  constructor(
    @Inject(RegisterClient)
    private readonly registerClient: RegisterClient,
  ) {}

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
