import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
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
    application = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
  });

  afterAll(async () => {
    await application?.close();
    await context?.stop();
  });

  it('opens the API job client before registration queues email', async () => {
    const registerClient = application.get(RegisterClient);

    await expect(
      registerClient.execute({
        name: 'Runtime Client',
        email: `runtime-${randomUUID()}@example.com`,
        password: 'some password',
      }),
    ).resolves.toMatchObject({
      email: expect.stringMatching(/^runtime-.*@example\.com$/),
      registrationContinuation: expect.any(String),
    });
  });
});
