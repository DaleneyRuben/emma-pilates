import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  VoidSaleController,
  voidSaleCommand,
} from '../src/booking/payments/void-sale.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';

const bearer = `Bearer ${'a'.repeat(43)}`;
const paymentId = '44444444-4444-4444-8444-444444444444';

const principal = (
  role:
    'assistant' | 'administrator' | 'trainer' | 'nutritionist' | 'coordinator',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-staff`,
    role,
    branchIds: [],
  },
});

describe('void sale endpoint', () => {
  let app: INestApplication<App>;
  let signedIn: AuthenticatedPrincipal = principal('administrator');
  const voidPayment = jest.fn<
    (command: { paymentId: string; reason: string }) => Promise<{
      paymentId: string;
      state: 'voided';
      voidReason: string;
      cancelledBookings: number;
    }>
  >();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [VoidSaleController],
      providers: [
        {
          provide: voidSaleCommand,
          useValue: (command: { paymentId: string; reason: string }) =>
            voidPayment(command),
        },
        {
          provide: authenticatedPrincipalResolver,
          useValue: () => Promise.resolve(signedIn),
        },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => voidPayment.mockReset());

  it('answers 200 for an Administrator and returns the voided sale', async () => {
    signedIn = principal('administrator');
    voidPayment.mockResolvedValue({
      paymentId,
      state: 'voided',
      voidReason: 'Registrada dos veces',
      cancelledBookings: 1,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/void`)
      .set('authorization', bearer)
      .send({ reason: 'Registrada dos veces' })
      .expect(200)
      .expect(({ body }: { body: { state: string; voidReason: string } }) => {
        expect(body.state).toBe('voided');
        expect(body.voidReason).toBe('Registrada dos veces');
      });
  });

  it.each(['assistant', 'trainer', 'nutritionist', 'coordinator'] as const)(
    'answers 403 for a %s',
    async (role) => {
      signedIn = principal(role);

      await request(app.getHttpServer())
        .post(`/api/v1/administrator/payments/${paymentId}/void`)
        .set('authorization', bearer)
        .send({ reason: 'Registrada dos veces' })
        .expect(403)
        .expect(({ body }: { body: { code: string } }) =>
          expect(body.code).toBe('administration_access_denied'),
        );
    },
  );

  it('answers 400 when the reason is missing', async () => {
    signedIn = principal('administrator');

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/void`)
      .set('authorization', bearer)
      .send({})
      .expect(400)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('void_reason_required'),
      );
    expect(voidPayment).not.toHaveBeenCalled();
  });
});
