import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ClientRegistrationController } from '../src/system-identity/registration/client-registration.controller';
import { RegisterClient } from '../src/system-identity/registration/register-client';

describe('client registration (e2e)', () => {
  let app: INestApplication<App>;
  const execute = jest.fn();

  beforeEach(async () => {
    execute.mockResolvedValue({
      email: 'client@example.com',
      registrationContinuation: 'registration-secret',
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ClientRegistrationController],
      providers: [{ provide: RegisterClient, useValue: { execute } }],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('starts registration with a neutral check-email response', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/client-registrations')
      .send({
        name: 'Ana Clienta',
        email: 'CLIENT@example.com',
        password: 'correct horse battery staple',
      })
      .expect(202)
      .expect({
        status: 'verification_required',
        email: 'client@example.com',
        registrationContinuation: 'registration-secret',
      });

    expect(execute).toHaveBeenCalledWith({
      name: 'Ana Clienta',
      email: 'CLIENT@example.com',
      password: 'correct horse battery staple',
    });
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });
});
