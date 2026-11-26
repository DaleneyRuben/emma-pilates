import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ReferralCodeLookupController,
  referralCodeLookup,
} from '../src/booking/acquisition/referral-code-lookup.controller';
import type { ReferralCodeLookup } from '../src/booking/acquisition/referral-code-lookup';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';

// Walkthrough n.º 18: «Crea tu cuenta» checks a code with no Account yet.
describe('referral code lookup (e2e)', () => {
  let app: INestApplication<App>;
  const lookUp = jest.fn<(code: string) => Promise<ReferralCodeLookup>>();

  beforeEach(async () => {
    lookUp.mockResolvedValue({
      code: 'LUCIA',
      status: 'valid',
      holderFirstName: 'Lucía',
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReferralCodeLookupController],
      providers: [
        { provide: referralCodeLookup, useValue: lookUp },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('answers a code without a credential and is never cached', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/referral-codes/lookup?code=lucia')
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({ code: 'LUCIA', status: 'valid', holderFirstName: 'Lucía' });
    expect(lookUp).toHaveBeenCalledWith('lucia');
  });

  it('refuses a request without a code', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/referral-codes/lookup')
      .expect(400);
    expect(lookUp).not.toHaveBeenCalled();
  });
});
