import * as matchers from "@testing-library/react-native/matchers";
import { notifyManager, timeoutManager } from "@tanstack/react-query";

expect.extend(matchers);

// React 18+ wants a test environment to say so; RNTL only switches the flag on
// inside its own act() and off inside waitFor, and leaves it unset otherwise,
// so an update that lands between two awaited calls (a navigator's screen
// mounting, a query settling) is reported as «not configured to support act».
const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

// TanStack Query batches its observer notifications on a timer, so a query
// that settles inside an awaited render, fireEvent, or waitFor would deliver
// its result a tick later, outside that scope, and React would report the
// update. Delivering notifications synchronously keeps each result inside the
// scope that produced it.
notifyManager.setScheduler((callback) => {
  callback();
});

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

// MOB-054: a React act() warning fails the spec that let it through instead of
// scrolling past in the output. The warning is still printed, so the failing
// spec shows which update landed outside an act scope.
const actWarnings: string[] = [];
const reportError = console.error;
console.error = (...args: unknown[]) => {
  reportError(...args);
  const message = String(args[0]);
  if (/not wrapped in act|not configured to support act|overlapping act/.test(message)) {
    actWarnings.push(message.split("\n")[0] ?? message);
  }
};
afterEach(() => {
  const seen = actWarnings.splice(0);
  expect(seen).toEqual([]);
});
afterAll(() => {
  expect(actWarnings).toEqual([]);
});

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: () => () => undefined,
}));
