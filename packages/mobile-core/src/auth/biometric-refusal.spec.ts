import { createBiometricRefusalCheck } from "./biometric-refusal";

const facialRecognition = 2;

function localAuthentication({
  hasHardware = true,
  types = [facialRecognition],
}: { hasHardware?: boolean | Error; types?: number[] } = {}) {
  return {
    hasHardwareAsync: jest.fn(async () => {
      if (hasHardware instanceof Error) throw hasHardware;
      return hasHardware;
    }),
    supportedAuthenticationTypesAsync: jest.fn(async () => types),
  };
}

// Owner, TestFlight 1.3.0: «No permitir» on iOS's Face ID alert left an
// iPhone with Face ID answering «cannot use» to the app, like one without it.
describe("createBiometricRefusalCheck", () => {
  it("sees an iPhone with Face ID whose permission the app was refused", async () => {
    await expect(
      createBiometricRefusalCheck(localAuthentication({ hasHardware: false }), "ios")(),
    ).resolves.toBe(true);
  });

  it("does not call an allowed Face ID refused", async () => {
    await expect(createBiometricRefusalCheck(localAuthentication(), "ios")()).resolves.toBe(false);
  });

  it("does not call a phone without Face ID or Touch ID refused", async () => {
    await expect(
      createBiometricRefusalCheck(localAuthentication({ hasHardware: false, types: [] }), "ios")(),
    ).resolves.toBe(false);
  });

  it("never asks on Android, which has no per-app biometric permission", async () => {
    const native = localAuthentication({ hasHardware: false });

    await expect(createBiometricRefusalCheck(native, "android")()).resolves.toBe(false);
    expect(native.hasHardwareAsync).not.toHaveBeenCalled();
  });

  it("answers no when the native module cannot answer", async () => {
    await expect(
      createBiometricRefusalCheck(
        localAuthentication({ hasHardware: new Error("no module") }),
        "ios",
      )(),
    ).resolves.toBe(false);
  });
});
