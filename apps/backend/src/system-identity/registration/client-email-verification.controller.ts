import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  ClientEmailVerificationResultDto,
  parseClientEmailVerification,
  VerifyClientEmailDto,
} from './client-email-verification.dto';
import { VerifyClientEmail } from './verify-client-email';

@Controller({ path: 'client-email-verifications', version: '1' })
export class ClientEmailVerificationController {
  constructor(
    @Inject(VerifyClientEmail)
    private readonly verifyClientEmail: VerifyClientEmail,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'verifyClientEmail' })
  @ApiOkResponse({ type: ClientEmailVerificationResultDto })
  async verify(
    @Body() body: VerifyClientEmailDto,
  ): Promise<ClientEmailVerificationResultDto> {
    const command = parseClientEmailVerification(body);

    if (command === null) {
      throw new BadRequestException(
        'Invalid client email verification request',
      );
    }

    return this.verifyClientEmail.execute(command);
  }
}
