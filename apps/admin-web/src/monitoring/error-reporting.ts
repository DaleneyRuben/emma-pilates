import * as Sentry from "@sentry/react";
import type { ErrorEvent, EventHint } from "@sentry/react";
import type { RootOptions } from "react-dom/client";

export type ErrorReportingSettings = {
  dsn: string | undefined;
  environment: string;
  release: string | undefined;
};

export type RootErrorHandlers = Pick<
  RootOptions,
  "onCaughtError" | "onUncaughtError" | "onRecoverableError"
>;

type ErrorReportingSdk = Pick<
  typeof Sentry,
  | "init"
  | "globalHandlersIntegration"
  | "dedupeIntegration"
  | "reactErrorHandler"
>;

export function sanitizeErrorEvent(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  void hint;
  return event;
}

export function startErrorReporting(
  settings: ErrorReportingSettings,
  sdk: ErrorReportingSdk = Sentry,
): RootErrorHandlers {
  void settings;
  void sdk;
  return {};
}
