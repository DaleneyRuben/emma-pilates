import type { ErrorEvent } from "@sentry/react";
import { ApiError } from "../api/problem";
import { sanitizeErrorEvent, startErrorReporting } from "./error-reporting";

const settings = {
  dsn: "https://token@errors.example.com/2",
  environment: "production",
  release: "e991a5aa",
};

const fakeSdk = () => {
  const handler = jest.fn();
  return {
    init: jest.fn(),
    globalHandlersIntegration: jest.fn(() => ({ name: "GlobalHandlers" })),
    dedupeIntegration: jest.fn(() => ({ name: "Dedupe" })),
    reactErrorHandler: jest.fn(() => handler),
    handler,
  };
};

describe("admin web error reporting (EXT-011)", () => {
  it("starts nothing without a DSN, so local runs and previews send nothing", () => {
    const sdk = fakeSdk();

    expect(startErrorReporting({ ...settings, dsn: undefined }, sdk)).toEqual(
      {},
    );
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it("captures only uncaught errors and rejections, tagged with the service", () => {
    const sdk = fakeSdk();

    startErrorReporting(settings, sdk);

    expect(sdk.init).toHaveBeenCalledWith({
      dsn: settings.dsn,
      environment: "production",
      release: "e991a5aa",
      defaultIntegrations: false,
      integrations: [{ name: "GlobalHandlers" }, { name: "Dedupe" }],
      sendDefaultPii: false,
      sendClientReports: false,
      initialScope: { tags: { service: "admin-web" } },
      beforeSend: sanitizeErrorEvent,
    });
  });

  // React 19 hands the root every error a boundary caught, every error none
  // caught, and every error it recovered from.
  it("reports the root's caught, uncaught, and recoverable render errors", () => {
    const sdk = fakeSdk();

    const handlers = startErrorReporting(settings, sdk);

    expect(handlers).toEqual({
      onCaughtError: sdk.handler,
      onUncaughtError: sdk.handler,
      onRecoverableError: sdk.handler,
    });
  });

  it("keeps only the exception type and stack, release, and the service tag", () => {
    const event = {
      event_id: "e1",
      timestamp: 1,
      level: "error",
      platform: "javascript",
      environment: "production",
      release: "e991a5aa",
      message: "lucia@example.com",
      tags: { service: "admin-web", email: "lucia@example.com" },
      request: {
        url: "https://emma-pilates-admin.vercel.app/clientes?q=lucia",
      },
      user: { ip_address: "203.0.113.9" },
      breadcrumbs: [{ message: "lucia@example.com" }],
      extra: { body: "emma-local-2026" },
      contexts: { react: { componentStack: "at ClientRow" } },
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Cannot read lucia@example.com",
            mechanism: { type: "onerror", handled: false },
            stacktrace: {
              frames: [
                {
                  filename:
                    "https://emma-pilates-admin.vercel.app/assets/index-B4kz9.js?v=1#x",
                  function: "a.x",
                  lineno: 1,
                  colno: 48213,
                  in_app: true,
                  vars: { password: "emma-local-2026" },
                },
              ],
            },
          },
        ],
      },
    } as unknown as ErrorEvent;

    expect(sanitizeErrorEvent(event, {})).toEqual({
      type: undefined,
      event_id: "e1",
      timestamp: 1,
      level: "error",
      platform: "javascript",
      environment: "production",
      release: "e991a5aa",
      tags: { service: "admin-web" },
      exception: {
        values: [
          {
            type: "TypeError",
            mechanism: { type: "onerror", handled: false },
            stacktrace: {
              frames: [
                {
                  filename:
                    "https://emma-pilates-admin.vercel.app/assets/index-B4kz9.js",
                  function: "a.x",
                  lineno: 1,
                  colno: 48213,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
    });
  });

  // ADR-0081: an RFC 9457 client error is the backend's deliberate answer.
  it("drops a 4xx API answer and keeps a 5xx or an unreachable backend", () => {
    const event = { event_id: "e2" } as ErrorEvent;
    const answer = (status: number, code: string) => ({
      originalException: new ApiError({ status, code }),
    });

    expect(
      sanitizeErrorEvent(event, answer(403, "administration_access_denied")),
    ).toBeNull();
    expect(sanitizeErrorEvent(event, answer(409, "conflict"))).toBeNull();
    expect(
      sanitizeErrorEvent(event, answer(500, "unexpected_error")),
    ).not.toBeNull();
    expect(
      sanitizeErrorEvent(event, answer(0, "network_error")),
    ).not.toBeNull();
  });
});
