import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ReadinessController,
  readinessCheck,
  releaseIdentifier,
} from '../src/health/readiness.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';

describe('readiness (e2e)', () => {
  let app: INestApplication<App>;
  const ready = jest.fn<() => Promise<boolean>>();

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReadinessController],
      providers: [
        { provide: readinessCheck, useValue: ready },
        { provide: releaseIdentifier, useValue: 'release-42' },
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

  it('reports readiness with the serving release and no dependency details', () => {
    ready.mockResolvedValue(true);

    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ready', release: 'release-42' });
  });

  it('answers 503 as a problem without naming the failing dependency', () => {
    ready.mockResolvedValue(false);

    return request(app.getHttpServer())
      .get('/health/ready')
      .expect('Content-Type', /application\/problem\+json/)
      .expect(503)
      .expect({
        type: 'about:blank',
        title: 'Service Unavailable',
        status: 503,
        detail: 'The API is not ready to receive traffic',
        instance: '/health/ready',
        code: 'not_ready',
      });
  });
});
