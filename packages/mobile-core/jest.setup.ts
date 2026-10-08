import * as matchers from "@testing-library/react-native/matchers";
import { timeoutManager } from "@tanstack/react-query";

expect.extend(matchers);

// MOB-057: TanStack schedules a five-minute garbage-collection timer for every
// query and mutation that loses its last observer, which RNTL's cleanup makes
// happen at the end of every spec. A Jest worker is killed half a second after
// the run, so the timers go unnoticed where the suite has workers; where Jest
// runs the suite in its own process (one worker, as on CI's two-core runner)
// they keep Node alive for five minutes after the summary. A timer that does
// not hold the process still fires while a spec runs, because Jest's own
// timeout holds it then, so staleTime, gcTime, retries, and the persister's
// throttle behave as before.
timeoutManager.setTimeoutProvider({
  setTimeout: (callback, delay) => setTimeout(callback, delay).unref(),
  clearTimeout: (timeoutId) => clearTimeout(timeoutId),
  setInterval: (callback, delay) => setInterval(callback, delay).unref(),
  clearInterval: (intervalId) => clearInterval(intervalId),
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: () => () => undefined,
}));
