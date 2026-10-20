import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { Environment } from './config/environment';
import {
  configureApplication,
  servesApiDocumentation,
} from './http/configure-application';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    // ADR-0094: the Resend webhook verifies its signature over the raw body.
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService<Environment, true>);
  configureApplication(app, {
    serveDocumentation: servesApiDocumentation({
      NODE_ENV: config.get('NODE_ENV', { infer: true }),
      ERROR_REPORTING_ENVIRONMENT: config.get('ERROR_REPORTING_ENVIRONMENT', {
        infer: true,
      }),
    }),
  });
  // Readiness fails once shutdown begins (ADR-0080).
  app.enableShutdownHooks();
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
