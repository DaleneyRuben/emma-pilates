import { randomUUID } from 'node:crypto';
import { isNativeError } from 'node:util/types';
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

// Only an allowlist of error fields reaches the logs: driver and ORM errors
// carry `detail`, `meta`, or query parameters that can echo personal data.
// pino-http hands this serializer pino's own serialized error, which already
// names the class in `type`; a raw error names it through its constructor.
export function describeFailure(error: unknown): Record<string, unknown> {
  if (typeof error !== 'object' || error === null) {
    return { type: typeof error };
  }
  const fields = error as Record<string, unknown>;
  const type =
    typeof fields.type === 'string'
      ? fields.type
      : isNativeError(error)
        ? error.constructor.name
        : 'object';
  const pick = (key: 'code' | 'message' | 'stack') =>
    typeof fields[key] === 'string' ? { [key]: fields[key] } : {};
  return { type, ...pick('code'), ...pick('message'), ...pick('stack') };
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
      err: describeFailure,
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
