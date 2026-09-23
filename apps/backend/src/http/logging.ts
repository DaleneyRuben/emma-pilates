import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import type { Options } from 'pino-http';

// A caller-supplied identifier is kept only when it cannot smuggle log syntax.
const requestIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export function correlationId(header: string | string[] | undefined): string {
  return typeof header === 'string' && requestIdPattern.test(header)
    ? header
    : randomUUID();
}

export type LoggerSettings = {
  environment: string;
  service: 'api' | 'worker';
  release: string;
  destination?: DestinationStream;
};

// ADR-0081: JSON lines with environment, service, release, and the request
// identifier. Headers, bodies, and query strings are never serialized because
// they can carry credentials or authentication links.
export function createLoggerParams(settings: LoggerSettings): Params {
  const options: Options = {
    base: {
      environment: settings.environment,
      service: settings.service,
      release: settings.release,
    },
    level: settings.environment === 'test' ? 'silent' : 'info',
    genReqId: (request, response) => {
      const id = correlationId(request.headers['x-request-id']);
      response.setHeader('x-request-id', id);
      return id;
    },
    customProps: (request) => ({ reqId: request.id }),
    serializers: {
      req: (request: { method?: string; url?: string }) => ({
        method: request.method,
        path: (request.url ?? '').split('?')[0],
      }),
      res: (response: { statusCode?: number }) => ({
        statusCode: response.statusCode,
      }),
    },
    // Expected RFC 9457 client errors are not application failures.
    customLogLevel: (_request, response, error) =>
      error !== undefined || response.statusCode >= 500 ? 'error' : 'info',
    autoLogging: {
      ignore: (request) => request.url?.startsWith('/health/') ?? false,
    },
  };

  return {
    pinoHttp:
      settings.destination === undefined
        ? options
        : [options, settings.destination],
  };
}
