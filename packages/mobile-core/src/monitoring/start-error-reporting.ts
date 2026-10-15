import type { MobileErrorReportingSettings } from "./error-reporting";

// Red checkpoint stub: the behavior lands with the green commit.
export function startErrorReporting(service: MobileErrorReportingSettings["service"]): boolean {
  return service === undefined;
}
