import { Writable } from 'node:stream';
import { jest } from '@jest/globals';
import {
  Controller,
  Get,
  INestApplication,
  Module,
  NotFoundException,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { createLoggerParams } from '../src/http/logging';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { ERROR_REPORTER } from '../src/monitoring/error-reporting';

class DriverError extends Error {
  readonly code = '23505';
  readonly detail = 'Key (email)=(lucia@example.com) already exists.';
}

@Controller({ path: 'failing', version: '1' })
class FailingController {
  @Post()
  fail(): never {
    throw new DriverError('duplicate key value violates unique constraint');
  }

  @Get('missing')
  missing(): never {
    throw new NotFoundException();
  }

  @Get('unavailable')
  unavailable(): never {
    throw new ServiceUnavailableException({ code: 'not_ready' });
  }
}

describe('error logging (e2e)', () => {
  let app: INestApplication<App>;
  let lines: Record<string, unknown>[];
  let report: jest.Mock<
    (error: unknown, context?: { requestId?: string }) => void
  >;

  beforeEach(async () => {
    lines = [];
    report =
      jest.fn<(error: unknown, context?: { requestId?: string }) => void>();
    const destination = new Writable({
      write(chunk: Buffer, _encoding, done) {
        for (const line of chunk.toString().split('\n').filter(Boolean)) {
          lines.push(JSON.parse(line) as Record<string, unknown>);
        }
        done();
      },
    });

    @Module({
      imports: [
        LoggerModule.forRoot(
          createLoggerParams({
            environment: 'production',
            service: 'api',
            release: 'release-42',
            destination,
          }),
        ),
      ],
      controllers: [FailingController],
      providers: [
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
        { provide: ERROR_REPORTER, useValue: { report } },
      ],
    })
    class LoggedModule {}

    const moduleFixture = await Test.createTestingModule({
      imports: [LoggedModule],
    }).compile();
    app = moduleFixture.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    app.enableVersioning();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const errorLines = () =>
    lines.filter((line) => line.context === 'ProblemDetailsFilter');

  it('logs an unexpected failure with its request identifier and only safe error fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/failing')
      .send({ password: 'emma-local-2026' })
      .expect(500);

    expect(response.body).toMatchObject({
      detail: 'An unexpected error occurred',
      code: 'unexpected_error',
    });
    const [line] = errorLines();
    expect(line).toMatchObject({
      reqId: response.headers['x-request-id'],
      err: {
        type: 'DriverError',
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      },
    });
    expect((line.err as { stack?: string }).stack).toContain(
      'FailingController.fail',
    );
    const serialized = JSON.stringify(lines);
    expect(serialized).not.toContain('lucia@example.com');
    expect(serialized).not.toContain('emma-local-2026');
  });

  it('does not report an expected client error as an application failure', async () => {
    await request(app.getHttpServer()).get('/v1/failing/missing').expect(404);

    expect(errorLines()).toEqual([]);
    expect(lines.some((line) => Number(line.level) >= 50)).toBe(false);
  });

  // ADR-0081: only unexpected failures reach Better Stack.
  it('reports an unexpected failure to the error reporter', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/failing')
      .expect(500);

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(expect.any(DriverError), {
      requestId: response.headers['x-request-id'],
    });
  });

  it('does not report client errors or a deliberate unavailable answer', async () => {
    await request(app.getHttpServer()).get('/v1/failing/missing').expect(404);
    await request(app.getHttpServer())
      .get('/v1/failing/unavailable')
      .expect(503);

    expect(report).not.toHaveBeenCalled();
  });
});
