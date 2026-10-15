import type { ErrorEvent } from "@sentry/react-native";

import { AuthenticationApiError } from "../auth/authentication-api";
import {
  errorReportingEnvironment,
  reportCaughtRenderError,
  sanitizeMobileErrorEvent,
  startMobileErrorReporting,
} from "./error-reporting";

const settings = {
  dsn: "https://token@errors.example.com/3",
  environment: "production",
  service: "client-mobile" as const,
};

const fakeSdk = () => ({
  init: jest.fn(),
  reactNativeErrorHandlersIntegration: jest.fn(() => ({ name: "ReactNativeErrorHandlers" })),
  dedupeIntegration: jest.fn(() => ({ name: "Dedupe" })),
  nativeReleaseIntegration: jest.fn(() => ({ name: "Release" })),
  createReactNativeRewriteFrames: jest.fn(() => ({ name: "RewriteFrames" })),
});

describe("mobile error reporting (EXT-013)", () => {
  it("starts nothing without a DSN, so local runs and tests send nothing", () => {
    const sdk = fakeSdk();

    expect(startMobileErrorReporting({ ...settings, dsn: undefined }, sdk)).toBe(false);
    expect(startMobileErrorReporting({ ...settings, dsn: "" }, sdk)).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it("captures only uncaught errors and rejections, tagged with the app's service", () => {
    const sdk = fakeSdk();

    expect(startMobileErrorReporting(settings, sdk)).toBe(true);

    expect(sdk.reactNativeErrorHandlersIntegration).toHaveBeenCalledWith({
      patchGlobalPromise: true,
    });
    expect(sdk.init).toHaveBeenCalledWith({
      dsn: settings.dsn,
      environment: "production",
      // Only the error handlers, plus what matches an event to its uploaded
      // source map: the native release and app:/// frame names.
      defaultIntegrations: false,
      integrations: [
        { name: "ReactNativeErrorHandlers" },
        { name: "Dedupe" },
        { name: "Release" },
        { name: "RewriteFrames" },
      ],
      sendDefaultPii: false,
      sendClientReports: false,
      maxBreadcrumbs: 0,
      enableAutoSessionTracking: false,
      enableAutoPerformanceTracing: false,
      enableAppHangTracking: false,
      enableCaptureFailedRequests: false,
      enableNativeNagger: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      initialScope: { tags: { service: "client-mobile" } },
      beforeSend: sanitizeMobileErrorEvent,
    });
  });

  it("keeps only the exception type and stack, the release, debug ids, and the service tag", () => {
    const event = {
      event_id: "e1",
      timestamp: 1,
      level: "fatal",
      platform: "javascript",
      environment: "production",
      release: "com.emmapilates.client@1.0.0+3",
      dist: "3",
      message: "lucia@example.com",
      tags: { service: "client-mobile", email: "lucia@example.com" },
      user: { ip_address: "203.0.113.9" },
      breadcrumbs: [{ message: "lucia@example.com" }],
      extra: { body: "emma-local-2026" },
      contexts: { device: { model: "iPhone17,1" }, react: { componentStack: "at ClientRow" } },
      request: { url: "emmapilates-client://activate?token=secret" },
      debug_meta: {
        images: [
          {
            type: "sourcemap",
            code_file: "app:///main.jsbundle",
            debug_id: "8f2c3a2e-1b2c-4d3e-9f40-5a6b7c8d9e0f",
            image_addr: "0x1",
          },
        ],
      },
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Cannot read lucia@example.com",
            mechanism: { type: "onerror", handled: false, data: { url: "x?token=secret" } },
            stacktrace: {
              frames: [
                {
                  filename: "http://127.0.0.1:8083/index.bundle?platform=ios&dev=true#x",
                  function: "BookingCard",
                  lineno: 1,
                  colno: 48213,
                  in_app: true,
                  vars: { password: "emma-local-2026" },
                  context_line: "const email = 'lucia@example.com'",
                },
              ],
            },
          },
        ],
      },
    } as unknown as ErrorEvent;

    expect(sanitizeMobileErrorEvent(event, {})).toEqual({
      type: undefined,
      event_id: "e1",
      timestamp: 1,
      level: "fatal",
      platform: "javascript",
      environment: "production",
      release: "com.emmapilates.client@1.0.0+3",
      dist: "3",
      tags: { service: "client-mobile" },
      debug_meta: {
        images: [
          {
            type: "sourcemap",
            code_file: "app:///main.jsbundle",
            debug_id: "8f2c3a2e-1b2c-4d3e-9f40-5a6b7c8d9e0f",
          },
        ],
      },
      exception: {
        values: [
          {
            type: "TypeError",
            mechanism: { type: "onerror", handled: false },
            stacktrace: {
              frames: [
                {
                  filename: "http://127.0.0.1:8083/index.bundle",
                  function: "BookingCard",
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
    const failure = (status: number) => ({
      originalException: new AuthenticationApiError("Login failed", status, "x", 0),
    });

    expect(sanitizeMobileErrorEvent(event, failure(401))).toBeNull();
    expect(sanitizeMobileErrorEvent(event, failure(429))).toBeNull();
    expect(sanitizeMobileErrorEvent(event, failure(500))).not.toBeNull();
    expect(sanitizeMobileErrorEvent(event, failure(0))).not.toBeNull();
    expect(
      sanitizeMobileErrorEvent(event, { originalException: new TypeError("Network failed") }),
    ).not.toBeNull();
  });

  it("reports a render error a screen boundary caught as handled", () => {
    const capture = jest.fn();
    const error = new Error("render");

    reportCaughtRenderError(error, capture);

    expect(capture).toHaveBeenCalledWith(error, {
      mechanism: { type: "react_error_boundary", handled: true },
    });
  });

  // The EAS build profile's update channel names the environment; a bundle
  // served by Metro is always development.
  it("names the environment after the update channel, development under Metro", () => {
    expect(errorReportingEnvironment({ development: true, channel: "production" })).toBe(
      "development",
    );
    expect(errorReportingEnvironment({ development: false, channel: "preview" })).toBe("preview");
    expect(errorReportingEnvironment({ development: false, channel: null })).toBe("production");
    expect(errorReportingEnvironment({ development: false, channel: "" })).toBe("production");
  });
});
