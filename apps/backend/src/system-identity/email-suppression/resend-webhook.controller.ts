import { Controller } from '@nestjs/common';
import type { EmailSuppressionInput } from './resend-delivery-event';

export const resendWebhookRuntime = Symbol('resendWebhookRuntime');

export type ResendWebhookRuntime = {
  secret: string | null;
  record(suppressions: EmailSuppressionInput[]): Promise<void>;
  now(): Date;
};

// Red checkpoint stub: the endpoint is implemented in the next commit.
@Controller({ path: 'email-delivery-events', version: '1' })
export class ResendWebhookController {}
