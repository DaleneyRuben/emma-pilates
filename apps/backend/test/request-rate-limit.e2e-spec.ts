import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/http/configure-application';
import { generalRequestLimits } from '../src/system-identity/security/request-rate-limit';

const minute = 60_000;

// The limiter counts in minute windows; start well inside one so the loop
// below never straddles a boundary.
const awayFromMinuteBoundary = async (): Promise<void> => {
  const remaining = minute - (Date.now() % minute);
  if (remaining < 15_000) {
    await new Promise((resolve) => setTimeout(resolve, remaining + 100));
  }
};

describe('general request rate limit (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('answers 429 with Retry-After once one credential spends its minute', async () => {
    await awayFromMinuteBoundary();
    const server = app.getHttpServer();
    const authorization = `Bearer ${'r'.repeat(43)}`;

    for (
      let sent = 0;
      sent < generalRequestLimits.perCredentialPerMinute;
      sent += 1
    ) {
      await request(server)
        .get('/api/v1/rate-limit-probe')
        .set('authorization', authorization)
        .expect(404);
    }

    const limited = await request(server)
      .get('/api/v1/rate-limit-probe')
      .set('authorization', authorization)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(429);

    expect(limited.body).toMatchObject({
      status: 429,
      code: 'rate_limit_exceeded',
    });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(limited.headers['retry-after'])).toBeLessThanOrEqual(60);

    await request(server)
      .get('/api/v1/rate-limit-probe')
      .set('authorization', `Bearer ${'s'.repeat(43)}`)
      .expect(404);
    await request(server).get('/health/live').expect(200);
  }, 60_000);
});
