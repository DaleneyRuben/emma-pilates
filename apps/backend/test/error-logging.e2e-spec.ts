import { Writable } from 'node:stream';
import {
  Controller,
  Get,
  INestApplication,
  Module,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { createLoggerParams } from '../src/http/logging';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';

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
}

describe('error logging (e2e)', () => {
  let app: INestApplication<App>;
  let lines: Record<string, unknown>[];

  beforeEach(async () => {
    lines = [];
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
      providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }],
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
    expect((line.err as { stack?: string }).stack).toContain('DriverError');
    const serialized = JSON.stringify(lines);
    expect(serialized).not.toContain('lucia@example.com');
    expect(serialized).not.toContain('emma-local-2026');
  });

  it('does not report an expected client error as an application failure', async () => {
    await request(app.getHttpServer()).get('/v1/failing/missing').expect(404);

    expect(errorLines()).toEqual([]);
    expect(lines.some((line) => line.level >= 50)).toBe(false);
  });
});
