import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import type { PrismaClient } from '../../generated/prisma/client';
import { authenticationDigest } from '../security/authentication-digest';
import { createPrismaEmailSuppressions } from './prisma-email-suppressions';
import {
  ResendWebhookController,
  resendWebhookRuntime,
  type ResendWebhookRuntime,
} from './resend-webhook.controller';

// ADR-0094's webhook, wired here so system-identity.module.ts stays under the
// file-size limit (the email-change wiring pattern).
export const emailSuppressionWiring = {
  controllers: [ResendWebhookController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: resendWebhookRuntime,
      inject: [prismaToken, ConfigService],
      useFactory: (
        prisma: PrismaClient,
        config: ConfigService<Environment, true>,
      ): ResendWebhookRuntime => ({
        secret: config.get('RESEND_WEBHOOK_SECRET', { infer: true }),
        record: createPrismaEmailSuppressions(
          prisma,
          authenticationDigest(config),
        ).record,
        now: () => new Date(),
      }),
    },
  ],
};
