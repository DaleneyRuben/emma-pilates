import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { ClientRegistrationController } from '../src/system-identity/registration/client-registration.controller';
import { CorrectPendingClientEmail } from '../src/system-identity/registration/correct-pending-client-email';
import { RegisterClient } from '../src/system-identity/registration/register-client';
import { ResendPendingClientVerification } from '../src/system-identity/registration/resend-pending-client-verification';

describe('client registration (e2e)', () => {
  let app: INestApplication<App>;
  const execute = jest.fn();
  const correctEmail = jest.fn();
  const resendVerification = jest.fn();

  beforeEach(async () => {
    execute.mockResolvedValue({
      email: 'client@example.com',
      registrationContinuation: 'registration-secret',
    });
    correctEmail.mockResolvedValue({
      status: 'corrected',
      email: 'corrected@example.com',
    });
    resendVerification.mockResolvedValue({ status: 'sent' });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ClientRegistrationController],
      providers: [
        { provide: RegisterClient, useValue: { execute } },
        {
          provide: CorrectPendingClientEmail,
          useValue: { execute: correctEmail },
        },
        {
          provide: ResendPendingClientVerification,
          useValue: { execute: resendVerification },
        },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('resends pending registration verification', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/client-registrations/verification-resends')
      .send({ registrationContinuation: 'registration-secret' })
      .expect(202)
      .expect({ status: 'verification_required' });

    expect(resendVerification).toHaveBeenCalledWith({
      registrationContinuation: 'registration-secret',
    });
  });

  it('corrects the pending registration email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/client-registrations/email-corrections')
      .send({
        registrationContinuation: 'registration-secret',
        email: 'corrected@example.com',
      })
      .expect(202)
      .expect({
        status: 'verification_required',
        email: 'corrected@example.com',
      });

    expect(correctEmail).toHaveBeenCalledWith({
      registrationContinuation: 'registration-secret',
      email: 'corrected@example.com',
    });
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
