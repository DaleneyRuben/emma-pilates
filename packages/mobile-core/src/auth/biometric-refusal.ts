import { Platform } from "react-native";

type LocalAuthentication = {
  hasHardwareAsync: () => Promise<boolean>;
  supportedAuthenticationTypesAsync: () => Promise<number[]>;
};

/**
 * Whether iOS refuses Face ID (or Touch ID) to the app although the iPhone
 * has it: «No permitir» on the system alert, undone only in Settings. iOS
 * still names the phone's biometry then, but reports no hardware for the app.
 * Android has no per-app biometric permission.
 */
export function createBiometricRefusalCheck(
  native: LocalAuthentication,
  os: string = Platform.OS,
): () => Promise<boolean> {
  return async () => {
    if (os !== "ios") return false;
    try {
      const [types, hasHardware] = await Promise.all([
        native.supportedAuthenticationTypesAsync(),
        native.hasHardwareAsync(),
      ]);
      return types.length > 0 && !hasHardware;
    } catch {
      return false;
    }
  };
}
