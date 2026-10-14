import * as Sentry from '@sentry/node';
import type { ErrorEvent, Exception, StackFrame } from '@sentry/node';

export const ERROR_REPORTER = Symbol('ERROR_REPORTER');

export type ErrorReportContext = { requestId?: string; job?: string };

export interface ErrorReporter {
  report(error: unknown, context?: ErrorReportContext): void;
}

export const noErrorReporting: ErrorReporter = { report: () => undefined };

type ErrorReportingSettings = {
  dsn: string | null;
  environment: string;
  release: string;
  service: 'api' | 'worker';
};

type ErrorReportingSdk = {
  initWithoutDefaultIntegrations(options: Sentry.NodeOptions): unknown;
  captureException(
    error: unknown,
    hint: { tags: Record<string, string> },
  ): unknown;
};

const collectNothing: Sentry.NodeOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
  frameContextLines: 0,
};

const keepFrame = (frame: StackFrame): StackFrame => ({
  filename: frame.filename,
  function: frame.function,
  lineno: frame.lineno,
  colno: frame.colno,
  in_app: frame.in_app,
});

const keepException = (exception: Exception): Exception => ({
  type: exception.type,
  mechanism: exception.mechanism,
  ...(exception.stacktrace && {
    stacktrace: { frames: exception.stacktrace.frames?.map(keepFrame) },
  }),
});

// ADR-0081: an allowlist. Requests, users, breadcrumbs, local variables,
// source lines, the host, and the message never leave the process: driver and
// ORM messages can echo query arguments. The type, code, and stack locate the
// failure, and the request identifier or worker job finds its full log line.
export function sanitizeErrorEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    environment: event.environment,
    release: event.release,
    tags: {
      service: event.tags?.service,
      ...(event.tags?.error_code !== undefined && {
        error_code: event.tags.error_code,
      }),
      ...(event.tags?.request_id !== undefined && {
        request_id: event.tags.request_id,
      }),
      ...(event.tags?.job !== undefined && { job: event.tags.job }),
    },
    exception: { values: event.exception?.values?.map(keepException) },
  };
}

// Provider initialization stays at the application shell (ADR-0081); without
// a DSN nothing is initialized, so local runs and tests send nothing.
export function createErrorReporter(
  settings: ErrorReportingSettings,
  sdk: ErrorReportingSdk = Sentry,
): ErrorReporter {
  if (settings.dsn === null) {
    return noErrorReporting;
  }
  sdk.initWithoutDefaultIntegrations({
    dsn: settings.dsn,
    environment: settings.environment,
    release: settings.release,
    includeServerName: false,
    dataCollection: collectNothing,
    sendClientReports: false,
    enableRuntimeChannelInjection: false,
    initialScope: { tags: { service: settings.service } },
    beforeSend: sanitizeErrorEvent,
  });
  return {
    report: (error, context = {}) => {
      const code = (error as { code?: unknown } | null)?.code;
      void sdk.captureException(error, {
        tags: {
          ...(typeof code === 'string' && { error_code: code }),
          ...(context.requestId !== undefined && {
            request_id: context.requestId,
          }),
          ...(context.job !== undefined && { job: context.job }),
        },
      });
    },
  };
}
