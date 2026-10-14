import {
  dedupeIntegration,
  globalHandlersIntegration,
  init,
  reactErrorHandler,
} from "@sentry/react";
import type {
  BrowserOptions,
  ErrorEvent,
  EventHint,
  Exception,
  StackFrame,
} from "@sentry/react";
import type { ErrorInfo } from "react";
import type { RootOptions } from "react-dom/client";
import { isApiError } from "../api/problem";

export type ErrorReportingSettings = {
  dsn: string | undefined;
  environment: string;
  release: string | undefined;
};

export type RootErrorHandlers = Pick<
  RootOptions,
  "onCaughtError" | "onUncaughtError" | "onRecoverableError"
>;

type Integration = Extract<
  BrowserOptions["integrations"],
  readonly unknown[]
>[number];

const collectNothing: BrowserOptions["dataCollection"] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};

type ErrorReportingSdk = {
  init(options: BrowserOptions): unknown;
  globalHandlersIntegration(): Integration;
  dedupeIntegration(): Integration;
  reactErrorHandler(): (error: unknown, errorInfo: ErrorInfo) => void;
};

// Asset URLs carry no query, but nothing after `?` or `#` may leave the page.
const withoutQuery = (filename: string | undefined) =>
  filename?.replace(/[?#].*$/, "");

const keepFrame = (frame: StackFrame): StackFrame => ({
  filename: withoutQuery(frame.filename),
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

const isClientErrorAnswer = (error: unknown) =>
  isApiError(error) && error.status >= 400 && error.status < 500;

// ADR-0081: the backend's allowlist. The message, page URL, user, breadcrumbs,
// and component stack never leave the browser; an RFC 9457 client error is a
// deliberate answer, not a failure.
export function sanitizeErrorEvent(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  if (isClientErrorAnswer(hint.originalException)) {
    return null;
  }
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    environment: event.environment,
    release: event.release,
    tags: { service: event.tags?.service },
    exception: { values: event.exception?.values?.map(keepException) },
  };
}

// Provider initialization stays at the application shell (ADR-0081); without
// a DSN nothing starts, so local runs, tests, and previews send nothing.
export function startErrorReporting(
  settings: ErrorReportingSettings,
  // Named imports, not the namespace, so the bundle keeps only these.
  sdk: ErrorReportingSdk = {
    init,
    globalHandlersIntegration: () => globalHandlersIntegration(),
    dedupeIntegration,
    reactErrorHandler: () => reactErrorHandler(),
  },
): RootErrorHandlers {
  if (settings.dsn === undefined || settings.dsn === "") {
    return {};
  }
  sdk.init({
    dsn: settings.dsn,
    // Same origin (EXT-012): content blockers refuse the ingest host itself.
    tunnel: "/api/monitoring/envelope",
    environment: settings.environment,
    release: settings.release,
    // No replay, breadcrumbs, console capture, or page context: only errors
    // nothing handled.
    defaultIntegrations: false,
    integrations: [sdk.globalHandlersIntegration(), sdk.dedupeIntegration()],
    dataCollection: collectNothing,
    sendClientReports: false,
    initialScope: { tags: { service: "admin-web" } },
    beforeSend: sanitizeErrorEvent,
  });
  const report = sdk.reactErrorHandler();
  return {
    onCaughtError: report,
    onUncaughtError: report,
    onRecoverableError: report,
  };
}
