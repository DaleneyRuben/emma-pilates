import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from './../src/app.module';
import { configureApplication } from './../src/http/configure-application';

@Controller({ path: 'probe', version: '1' })
class VersionedProbeController {
  @Get()
  getProbe(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

describe('operational health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [VersionedProbeController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('reports process liveness without versioning', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('does not expose the NestJS starter route', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect('Content-Type', /application\/problem\+json/)
      .expect(404)
      .expect({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Cannot GET /',
        instance: '/',
        code: 'resource_not_found',
      });
  });

  it('serves versioned application endpoints below /api/v1', () => {
    return request(app.getHttpServer())
      .get('/api/v1/probe')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('publishes the generated OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/openapi.json')
      .expect(200);
    const document = response.body as OpenAPIObject;

    expect(document).toMatchObject({
      info: {
        title: 'Emma Pilates API',
        version: '1.0.0',
      },
    });
    expect(document.openapi).toMatch(/^3\./);
    expect(document.paths).toHaveProperty('/api/v1/probe');
  });

  it('returns the OpenAPI document for offline artifact generation', () => {
    const document = configureApplication(app);

    expect(document).toMatchObject({
      info: {
        title: 'Emma Pilates API',
        version: '1.0.0',
      },
      paths: {
        '/health/live': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/LivenessResponseDto',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it('publishes the purchase and payment endpoints from the application module', () => {
    const document = configureApplication(app);

    for (const path of [
      '/api/v1/purchase-intents',
      '/api/v1/purchase-intents/current',
      '/api/v1/purchase-intents/{purchaseIntentId}/receipt',
      '/api/v1/purchase-intents/{purchaseIntentId}/submit',
      '/api/v1/credit-purchases',
      '/api/v1/payments/current',
      '/api/v1/clients/current/credit',
      '/api/v1/clients/current/referrals',
      '/api/v1/transfer-instructions',
      '/api/v1/transfer-instructions/qr',
      '/api/v1/administrator/payments/pending',
      '/api/v1/administrator/payments/{paymentId}',
      '/api/v1/administrator/payments/{paymentId}/receipt',
      '/api/v1/administrator/payments/{paymentId}/confirm',
      '/api/v1/administrator/payments/{paymentId}/reject',
      '/api/v1/administrator/sessions/{sessionId}/cancel',
    ]) {
      expect(document.paths).toHaveProperty(path);
    }
  });

  it('publishes the client registration lifecycle from the application module', () => {
    const document = configureApplication(app);

    expect(document.paths).toHaveProperty('/api/v1/client-registrations');
    expect(document.paths).toHaveProperty(
      '/api/v1/client-registrations/email-corrections',
    );
    expect(document.paths).toHaveProperty(
      '/api/v1/client-registrations/verification-resends',
    );
    expect(document.paths).toHaveProperty(
      '/api/v1/client-registrations/cancellations',
    );
    expect(document.paths).toHaveProperty('/api/v1/client-email-verifications');
  });

  afterEach(async () => {
    await app.close();
  });
});
