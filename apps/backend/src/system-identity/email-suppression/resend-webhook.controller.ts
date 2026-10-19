import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  suppressionsFromResendEvent,
  type EmailSuppressionInput,
} from './resend-delivery-event';
import { verifyResendWebhookSignature } from './resend-webhook-signature';

export const resendWebhookRuntime = Symbol('resendWebhookRuntime');

export type ResendWebhookRuntime = {
  secret: string | null;
  record(suppressions: EmailSuppressionInput[]): Promise<void>;
  now(): Date;
};

// ADR-0094: Resend's signed delivery events. Called by Resend, never by the
// apps, so it stays out of the OpenAPI contract.
@ApiExcludeController()
@Controller({ path: 'email-delivery-events', version: '1' })
export class ResendWebhookController {
  constructor(
    @Inject(resendWebhookRuntime)
    private readonly runtime: ResendWebhookRuntime,
  ) {}

  @Post('resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('svix-id') id: string | undefined,
    @Headers('svix-timestamp') timestamp: string | undefined,
    @Headers('svix-signature') signature: string | undefined,
  ): Promise<void> {
    if (this.runtime.secret === null) throw new NotFoundException();
    const body = request.rawBody;
    if (body === undefined) throw new BadRequestException();
    if (
      id === undefined ||
      !verifyResendWebhookSignature(
        this.runtime.secret,
        { id, timestamp, signature },
        body,
        this.runtime.now(),
      )
    ) {
      throw new UnauthorizedException();
    }

    let event: unknown;
    try {
      event = JSON.parse(body.toString('utf8'));
    } catch {
      throw new BadRequestException();
    }
    const suppressions = suppressionsFromResendEvent(id, event);
    if (suppressions.length > 0) await this.runtime.record(suppressions);
  }
}
