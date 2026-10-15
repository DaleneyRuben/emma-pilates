import {
  captureException,
  createReactNativeRewriteFrames,
  dedupeIntegration,
  init,
  nativeReleaseIntegration,
  reactNativeErrorHandlersIntegration,
} from "@sentry/react-native";
import type { ErrorEvent, Exception, ReactNativeOptions, StackFrame } from "@sentry/react-native";

type EventHint = Parameters<NonNullable<ReactNativeOptions["beforeSend"]>>[1];
type Integration = Extract<ReactNativeOptions["integrations"], readonly unknown[]>[number];
type DebugImage = NonNullable<NonNullable<ErrorEvent["debug_meta"]>["images"]>[number];

export type MobileErrorReportingSettings = {
  dsn: string | undefined;
  environment: string;
  service: "client-mobile" | "staff-mobile";
};

type ErrorReportingSdk = {
  init(options: ReactNativeOptions): unknown;
  reactNativeErrorHandlersIntegration(options: { patchGlobalPromise: boolean }): Integration;
  dedupeIntegration(): Integration;
  nativeReleaseIntegration(): Integration;
  createReactNativeRewriteFrames(): Integration;
};

/** The EAS update channel names the environment; a Metro bundle is development. */
export function errorReportingEnvironment({
  development,
  channel,
}: {
  development: boolean;
  channel: string | null;
}): string {
  if (development) {
    return "development";
  }
  return channel === null || channel === "" ? "production" : channel;
}

// A dev bundle URL carries Metro's query; nothing after `?` or `#` leaves the device.
const withoutQuery = (filename: string | undefined) => filename?.replace(/[?#].*$/, "");

const keepFrame = (frame: StackFrame): StackFrame => ({
  filename: withoutQuery(frame.filename),
  function: frame.function,
  lineno: frame.lineno,
  colno: frame.colno,
  in_app: frame.in_app,
});

const keepException = (exception: Exception): Exception => ({
  type: exception.type,
  ...(exception.mechanism && {
    mechanism: { type: exception.mechanism.type, handled: exception.mechanism.handled },
  }),
  ...(exception.stacktrace && {
    stacktrace: { frames: exception.stacktrace.frames?.map(keepFrame) },
  }),
});

// Debug ids tie a minified frame to the source map the EAS build uploaded.
const keepDebugImage = (image: DebugImage): DebugImage =>
  ({ type: image.type, code_file: image.code_file, debug_id: image.debug_id }) as DebugImage;

// AuthenticationApiError and AssistantApiError carry the answer's status.
const isClientErrorAnswer = (error: unknown) => {
  const status = error instanceof Error ? (error as { status?: unknown }).status : undefined;
  return typeof status === "number" && status >= 400 && status < 500;
};

// ADR-0081: the admin web's allowlist. The message, user, breadcrumbs, device
// context, and deep links never leave the device; an RFC 9457 client error is
// a deliberate answer, not a failure.
export function sanitizeMobileErrorEvent(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
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
    dist: event.dist,
    tags: { service: event.tags?.service },
    ...(event.debug_meta?.images && {
      debug_meta: { images: event.debug_meta.images.map(keepDebugImage) },
    }),
    exception: { values: event.exception?.values?.map(keepException) },
  };
}

/** A screen's boundary recovered, so nothing else reports it; a no-op until started. */
export function reportCaughtRenderError(
  error: unknown,
  capture: typeof captureException = captureException,
): void {
  capture(error, { mechanism: { type: "react_error_boundary", handled: true } });
}

// Provider initialization stays at the application shell (ADR-0081); without
// a DSN nothing starts, so local runs and tests send nothing.
export function startMobileErrorReporting(
  settings: MobileErrorReportingSettings,
  sdk: ErrorReportingSdk = {
    init,
    reactNativeErrorHandlersIntegration,
    dedupeIntegration,
    nativeReleaseIntegration,
    createReactNativeRewriteFrames,
  },
): boolean {
  if (settings.dsn === undefined || settings.dsn === "") {
    return false;
  }
  sdk.init({
    dsn: settings.dsn,
    environment: settings.environment,
    // Only the error handlers, plus what matches an event to its uploaded
    // source map: the native release and app:/// frame names.
    defaultIntegrations: false,
    integrations: [
      sdk.reactNativeErrorHandlersIntegration({ patchGlobalPromise: true }),
      sdk.dedupeIntegration(),
      sdk.nativeReleaseIntegration(),
      sdk.createReactNativeRewriteFrames(),
    ],
    sendDefaultPii: false,
    sendClientReports: false,
    // Also reaches the native SDK, so native crash reports carry none either.
    maxBreadcrumbs: 0,
    enableAutoSessionTracking: false,
    enableAutoPerformanceTracing: false,
    enableAppHangTracking: false,
    enableCaptureFailedRequests: false,
    // A development build without the native module still reports from
    // JavaScript; the nagger's alert would cover the screen.
    enableNativeNagger: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    initialScope: { tags: { service: settings.service } },
    beforeSend: sanitizeMobileErrorEvent,
  });
  return true;
}
