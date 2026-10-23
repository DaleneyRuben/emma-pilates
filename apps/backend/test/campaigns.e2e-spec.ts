import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  CampaignController,
  campaignGrant,
} from '../src/booking/payments/campaign.controller';
import { grantCampaign } from '../src/booking/payments/grant-campaign';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';

const bearer = `Bearer ${'a'.repeat(43)}`;
const key = '33333333-3333-4333-8333-333333333333';

const principal = (
  role:
    | 'assistant'
    | 'administrator'
    | 'trainer'
    | 'nutritionist'
    | 'coordinator',
): AuthenticatedPrincipal =>
  ({
    accountId: `${role}-account`,
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: `${role}-staff`,
      role,
      branchIds: [],
    },
  }) as AuthenticatedPrincipal;

describe('campaign endpoint', () => {
  let app: INestApplication<App>;
  let signedIn: AuthenticatedPrincipal = principal('administrator');
  const record = jest.fn<
    () => Promise<{ id: string; classes: number; reason: 'campaign' }>
  >();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [
        {
          provide: campaignGrant,
          useValue: (
            command: {
              name: string;
              classes: number;
              idempotencyKey: string;
            },
            actor: AuthenticatedPrincipal,
          ) =>
            grantCampaign(command, {
              principal: actor,
              now: new Date('2026-10-23T15:00:00.000Z'),
              today: new Date('2026-10-23T00:00:00.000Z'),
              findRecipients: () =>
                Promise.resolve([
                  {
                    clientId: '11111111-1111-4111-8111-111111111111',
                    name: 'Lucía',
                    subscriptionId: 'subscription',
                  },
                ]),
              findSkipped: () =>
                Promise.resolve([
                  {
                    clientId: '22222222-2222-4222-8222-222222222222',
                    name: 'Sofía',
                  },
                ]),
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
  beforeEach(() => {
    record.mockReset();
    record.mockResolvedValue({
      id: 'adjustment',
      classes: 1,
      reason: 'campaign',
    });
  });

  it('answers 201 with the granted and skipped Clients', async () => {
    signedIn = principal('administrator');

    await request(app.getHttpServer())
      .post('/api/v1/administrator/campaigns')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ name: 'Inicio de año', classes: 1 })
      .expect(201)
      .expect(
        ({
          body,
        }: {
          body: { granted: { name: string }[]; skipped: { name: string }[] };
        }) => {
          expect(body.granted.map((client) => client.name)).toEqual(['Lucía']);
          expect(body.skipped.map((client) => client.name)).toEqual(['Sofía']);
        },
      );
    expect(record).toHaveBeenCalledTimes(1);
  });

  it.each(['assistant', 'trainer', 'nutritionist', 'coordinator'] as const)(
    'answers 403 for a %s and writes nothing',
    async (role) => {
      signedIn = principal(role);

      await request(app.getHttpServer())
        .post('/api/v1/administrator/campaigns')
        .set('authorization', bearer)
        .set('idempotency-key', key)
        .send({ name: 'Vacaciones', classes: 1 })
        .expect(403)
        .expect(({ body }: { body: { code: string } }) =>
          expect(body.code).toBe('administration_access_denied'),
        );
      expect(record).not.toHaveBeenCalled();
    },
  );
});
