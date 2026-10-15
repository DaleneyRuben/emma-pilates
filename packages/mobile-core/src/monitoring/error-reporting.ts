import type { ErrorEvent, ReactNativeOptions } from "@sentry/react-native";

type EventHint = Parameters<NonNullable<ReactNativeOptions["beforeSend"]>>[1];

export type MobileErrorReportingSettings = {
  dsn: string | undefined;
  environment: string;
  service: "client-mobile" | "staff-mobile";
};

// Red checkpoint stub: the behavior lands with the green commit.
export function errorReportingEnvironment(context: {
  development: boolean;
  channel: string | null;
}): string {
  return String(context.channel === undefined);
}

export function sanitizeMobileErrorEvent(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  return hint === undefined ? event : null;
}

export function reportCaughtRenderError(error: unknown, capture?: (error: unknown) => void): void {
  return capture === undefined ? undefined : undefined;
}

export function startMobileErrorReporting(
  settings: MobileErrorReportingSettings,
  sdk?: unknown,
): boolean {
  return settings === sdk;
}
