import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
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
      providers: [
        { provide: RegisterClient, useValue: { execute } },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('rejects an invalid registration request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/client-registrations')
      .send({ name: '', email: 'not-an-email', password: '' })
      .expect('Content-Type', /application\/problem\+json/)
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            status: 400,
            code: 'invalid_request',
            instance: '/api/v1/client-registrations',
          }),
        );
      });

    expect(execute).not.toHaveBeenCalled();
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
