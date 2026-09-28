import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('client registration runtime', () => {
  let application: INestApplicationContext;
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    process.env.DATABASE_URL = context.databaseUrl;
    process.env.NODE_ENV = 'test';
    // ConfigModule.forRoot() reads the environment when AppModule is first
    // imported, so the import must follow the DATABASE_URL override or the
    // spec would write to the database named in .env.
    const { AppModule } = await import('../../src/app.module.js');
    application = await NestFactory.createApplicationContext(AppModule, {
      abortOnError: false,
      logger: false,
    });
  });

  afterAll(async () => {
    await application?.close();
    await context?.stop();
  });

  it('opens the API job client before registration queues email', async () => {
    const registerClient = application.get(RegisterClient);

    const result = await registerClient.execute({
      name: 'Runtime Client',
      email: `runtime-${randomUUID()}@example.com`,
      password: 'some password',
    });

    expect(result.email).toMatch(/^runtime-.*@example\.com$/);
    expect(result.registrationContinuation).not.toHaveLength(0);
  });
});
