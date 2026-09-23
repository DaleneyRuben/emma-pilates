import { Writable } from 'node:stream';
import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { createLoggerParams } from '../src/http/logging';

@Controller({ path: 'probe', version: '1' })
class ProbeController {
  @Get()
  getProbe(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

describe('request logging (e2e)', () => {
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
      controllers: [ProbeController],
    })
    class LoggedModule {}

    const moduleFixture = await Test.createTestingModule({
      imports: [LoggedModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.enableVersioning();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const completed = () =>
    lines.find((line) => line.msg === 'request completed') as
      | (Record<string, unknown> & {
          req: Record<string, unknown>;
          res: Record<string, unknown>;
        })
      | undefined;

  it('generates a correlation identifier and logs one structured line per request', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/probe?token=secret-link')
      .set('authorization', `Bearer ${'a'.repeat(43)}`)
      .expect(200);

    const requestId = response.headers['x-request-id'];
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    const line = completed();
    expect(line).toMatchObject({
      environment: 'production',
      service: 'api',
      release: 'release-42',
      reqId: requestId,
      req: { method: 'GET', path: '/v1/probe' },
      res: { statusCode: 200 },
    });
    const serialized = JSON.stringify(lines);
    expect(serialized).not.toContain('secret-link');
    expect(serialized).not.toContain('a'.repeat(43));
  });

  it('keeps a well-formed incoming request identifier', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/probe')
      .set('x-request-id', 'mobile-7f3a9c21')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('mobile-7f3a9c21');
    expect(completed()).toMatchObject({ reqId: 'mobile-7f3a9c21' });
  });

  it('replaces a malformed incoming request identifier', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/probe')
      .set('x-request-id', `bad id ${'x'.repeat(200)}`)
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
