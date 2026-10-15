import { channel } from "expo-updates";

import {
  errorReportingEnvironment,
  startMobileErrorReporting,
  type MobileErrorReportingSettings,
} from "./error-reporting";

/** Called once from each app's entry point, before the root component registers. */
export function startErrorReporting(service: MobileErrorReportingSettings["service"]): boolean {
  return startMobileErrorReporting({
    // An EAS environment variable; Expo inlines EXPO_PUBLIC_ values at bundle time.
    dsn: process.env.EXPO_PUBLIC_ERROR_REPORTING_DSN,
    environment: errorReportingEnvironment({ development: __DEV__, channel }),
    service,
  });
}
