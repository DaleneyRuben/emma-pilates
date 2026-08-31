import {
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
    @Body() command: StartClientRegistrationDto,
  ): Promise<PendingClientRegistrationDto> {
    const result = await this.registerClient.execute(command);

    return {
      status: 'verification_required',
      ...result,
    };
  }
}
