import './resend-webhook-wiring.environment';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/http/configure-application';

describe('Resend webhook wiring (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // main.ts creates the application with rawBody too.
    app = moduleFixture.createNestApplication({ rawBody: true });
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves the webhook from the application and refuses an unsigned event', () =>
    request(app.getHttpServer())
      .post('/api/v1/email-delivery-events/resend')
      .set('content-type', 'application/json')
      .send('{"type":"email.bounced"}')
      .expect(401));

  it('keeps the webhook out of the OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/openapi.json')
      .expect(200);

    expect(
      Object.keys((response.body as { paths: object }).paths),
    ).not.toContain('/api/v1/email-delivery-events/resend');
  });
});
