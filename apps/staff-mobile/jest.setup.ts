import * as matchers from "@testing-library/react-native/matchers";

expect.extend(matchers);

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
