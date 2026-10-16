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

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: () => () => undefined,
}));

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  // The native module only accepts typed arrays; a bare ArrayBuffer fails on
  // the device with NotTypedArrayException, so the mock refuses it too.
  digest: async (_algorithm: string, data: ArrayBufferView) => {
    if (!ArrayBuffer.isView(data)) {
      throw new Error("Given argument is not an instance of TypedArray");
    }
    const hash = require("node:crypto")
      .createHash("sha256")
      .update(Buffer.from(data.buffer, data.byteOffset, data.byteLength))
      .digest();
    return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
  },
  randomUUID: () => require("node:crypto").randomUUID(),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
  manipulateAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { Base64: "base64" },
  readAsStringAsync: jest.fn().mockResolvedValue(""),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-media-library/legacy", () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}));
