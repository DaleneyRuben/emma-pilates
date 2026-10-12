import type { ErrorEvent } from '@sentry/node';
import { createErrorReporter, sanitizeErrorEvent } from './error-reporting';

const settings = {
  dsn: 'https://token@errors.example.com/1',
  environment: 'development',
  release: 'release-42',
  service: 'api' as const,
};

const fakeSdk = () => ({
  initWithoutDefaultIntegrations: jest.fn(),
  captureException: jest.fn(),
});

describe('error reporting', () => {
  it('initializes nothing and reports nothing without a DSN', () => {
    const sdk = fakeSdk();
    const reporter = createErrorReporter({ ...settings, dsn: null }, sdk);

    reporter.report(new Error('boom'));

    expect(sdk.initWithoutDefaultIntegrations).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it('initializes the SDK without automatic capture and tags the service', () => {
    const sdk = fakeSdk();

    createErrorReporter(settings, sdk);

    expect(sdk.initWithoutDefaultIntegrations).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: settings.dsn,
        environment: 'development',
        release: 'release-42',
        includeServerName: false,
        dataCollection: expect.objectContaining({
          userInfo: false,
          httpHeaders: false,
          httpBodies: [],
          stackFrameVariables: false,
        }) as unknown,
        sendClientReports: false,
        enableRuntimeChannelInjection: false,
        initialScope: { tags: { service: 'api' } },
        beforeSend: sanitizeErrorEvent,
      }),
    );
  });

  it('captures a reported failure', () => {
    const sdk = fakeSdk();
    const reporter = createErrorReporter(settings, sdk);
    const failure = new Error('boom');

    reporter.report(failure);

    expect(sdk.captureException).toHaveBeenCalledWith(failure);
  });

  it('keeps only the exception, release, and service of an event', () => {
    const event = {
      type: undefined,
      event_id: 'e1',
      timestamp: 1,
      level: 'error',
      platform: 'node',
      environment: 'development',
      release: 'release-42',
      server_name: 'render-host-7',
      tags: { service: 'api', email: 'lucia@example.com' },
      request: { headers: { authorization: 'Bearer secret' } },
      user: { email: 'lucia@example.com' },
      breadcrumbs: [{ message: 'lucia@example.com' }],
      extra: { body: 'emma-local-2026' },
      contexts: { os: { name: 'linux' } },
      modules: { pg: '8.0.0' },
      exception: {
        values: [
          {
            type: 'DriverError',
            value: 'duplicate key value violates unique constraint',
            mechanism: { type: 'generic', handled: true },
            stacktrace: {
              frames: [
                {
                  filename: '/app/dist/src/failing.js',
                  function: 'fail',
                  lineno: 3,
                  colno: 9,
                  in_app: true,
                  vars: { password: 'emma-local-2026' },
                  context_line: 'const password = "emma-local-2026";',
                },
              ],
            },
          },
        ],
      },
    } as ErrorEvent;

    const sanitized = sanitizeErrorEvent(event);

    expect(sanitized).toEqual({
      type: undefined,
      event_id: 'e1',
      timestamp: 1,
      level: 'error',
      platform: 'node',
      environment: 'development',
      release: 'release-42',
      tags: { service: 'api' },
      exception: {
        values: [
          {
            type: 'DriverError',
            value: 'duplicate key value violates unique constraint',
            mechanism: { type: 'generic', handled: true },
            stacktrace: {
              frames: [
                {
                  filename: '/app/dist/src/failing.js',
                  function: 'fail',
                  lineno: 3,
                  colno: 9,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
    });
  });
});
