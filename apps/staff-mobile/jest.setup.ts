import * as matchers from "@testing-library/react-native/matchers";

expect.extend(matchers);

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
