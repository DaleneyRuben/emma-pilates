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
  EncodingType: { Base64: "base64" },
  readAsStringAsync: jest.fn().mockResolvedValue(""),
}));
