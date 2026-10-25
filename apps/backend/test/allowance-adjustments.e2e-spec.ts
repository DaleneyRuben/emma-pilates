import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  AllowanceAdjustmentController,
  allowanceAdjustmentCommand,
} from '../src/booking/payments/allowance-adjustment.controller';
import {
  recordAdministratorAdjustment,
  type RecordedAdjustment,
} from '../src/booking/payments/record-allowance-adjustment';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';

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

describe('allowance adjustment endpoint', () => {
  let app: INestApplication<App>;
  let signedIn: AuthenticatedPrincipal = principal('administrator');
  const record =
    jest.fn<
      (input: {
        subscriptionId: string;
        clientId: string;
        classes: number;
        reason: RecordedAdjustment['reason'];
        authorAccountId: string;
        now: Date;
      }) => Promise<RecordedAdjustment>
    >();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AllowanceAdjustmentController],
      providers: [
        {
          provide: allowanceAdjustmentCommand,
          useValue: (
            command: {
              clientId: string;
              classes: number;
              reason: 'courtesy' | 'class_return';
            },
            actor: AuthenticatedPrincipal,
          ) =>
            recordAdministratorAdjustment(command, {
              principal: actor,
              now: new Date('2026-10-23T15:00:00.000Z'),
              findSubscription: () => Promise.resolve({ id: 'subscription' }),
              record,
            }),
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
  beforeEach(() => record.mockReset());

  it('answers 201 for an Administrator', async () => {
    signedIn = principal('administrator');
    record.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      classes: 1,
      reason: 'courtesy' as const,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/clients/${clientId}/allowance-adjustments`)
      .set('authorization', bearer)
      .send({ classes: 1, reason: 'courtesy' })
      .expect(201)
      .expect(({ body }: { body: { reason: string } }) =>
        expect(body.reason).toBe('courtesy'),
      );
  });

  it.each(['assistant', 'trainer', 'nutritionist', 'coordinator'] as const)(
    'answers 403 for a %s',
    async (role) => {
      signedIn = principal(role);

      await request(app.getHttpServer())
        .post(`/api/v1/administrator/clients/${clientId}/allowance-adjustments`)
        .set('authorization', bearer)
        .send({ classes: 1, reason: 'class_return' })
        .expect(403)
        .expect(({ body }: { body: { code: string } }) =>
          expect(body.code).toBe('administration_access_denied'),
        );
    },
  );
});
