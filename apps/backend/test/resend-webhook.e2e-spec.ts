import { createHmac } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import {
  ResendWebhookController,
  resendWebhookRuntime,
  type ResendWebhookRuntime,
} from '../src/system-identity/email-suppression/resend-webhook.controller';

const key = Buffer.from('a-webhook-signing-key-for-tests!');
const secret = `whsec_${key.toString('base64')}`;
const now = new Date('2026-10-19T15:00:00.000Z');
const timestamp = String(now.getTime() / 1000);
const body = JSON.stringify({
  type: 'email.bounced',
  created_at: '2026-10-19T14:59:58.000Z',
  data: { to: ['client@example.com'], bounce: { type: 'Permanent' } },
});
const signature = (payload: string) =>
  `v1,${createHmac('sha256', key).update(`msg_1.${timestamp}.${payload}`).digest('base64')}`;

describe('Resend delivery webhook (e2e)', () => {
  let app: INestApplication<App>;
  const record = jest.fn<ResendWebhookRuntime['record']>();

  const start = async (webhookSecret: string | null) => {
    record.mockReset();
    record.mockResolvedValue(undefined);
    const moduleFixture = await Test.createTestingModule({
      controllers: [ResendWebhookController],
      providers: [
        {
          provide: resendWebhookRuntime,
          useValue: { secret: webhookSecret, record, now: () => now },
        },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleFixture.createNestApplication({ rawBody: true });
    configureApplication(app);
    await app.init();
  };

  const post = (payload: string, signed = signature(payload)) =>
    request(app.getHttpServer())
      .post('/api/v1/email-delivery-events/resend')
      .set('content-type', 'application/json')
      .set('svix-id', 'msg_1')
      .set('svix-timestamp', timestamp)
      .set('svix-signature', signed)
      .send(payload);

  afterEach(async () => {
    await app.close();
  });

  it('records a signed hard bounce as a suppression', async () => {
    await start(secret);

    await post(body).expect(204);

    expect(record).toHaveBeenCalledWith([
      {
        email: 'client@example.com',
        reason: 'HARD_BOUNCE',
        providerEventId: 'msg_1',
        providerOccurredAt: new Date('2026-10-19T14:59:58.000Z'),
      },
    ]);
  });

  it('acknowledges a signed event that suppresses nothing', async () => {
    await start(secret);
    const delivered = JSON.stringify({
      type: 'email.delivered',
      created_at: '2026-10-19T14:59:58.000Z',
      data: { to: ['client@example.com'] },
    });

    await post(delivered).expect(204);

    expect(record).not.toHaveBeenCalled();
  });

  it('rejects an unsigned or altered body', async () => {
    await start(secret);

    await post(body, 'v1,bm90LWEtc2lnbmF0dXJl').expect(401);
    await post(body.replace('Permanent', 'Transient'), signature(body)).expect(
      401,
    );

    expect(record).not.toHaveBeenCalled();
  });

  it('does not exist while no webhook secret is configured', async () => {
    await start(null);

    await post(body).expect(404);

    expect(record).not.toHaveBeenCalled();
  });
});
