import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Environment } from './config/environment';
import { configureApplication } from './http/configure-application';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);
  // Readiness fails once shutdown begins (ADR-0080).
  app.enableShutdownHooks();
  const config = app.get(ConfigService<Environment, true>);
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
