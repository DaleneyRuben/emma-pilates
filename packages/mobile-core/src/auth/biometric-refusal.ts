import { Platform } from "react-native";

// expo-local-authentication's AuthenticationType.FACIAL_RECOGNITION.
const facialRecognition = 2;

type LocalAuthentication = {
  hasHardwareAsync: () => Promise<boolean>;
  supportedAuthenticationTypesAsync: () => Promise<number[]>;
};

/**
 * Whether iOS refuses Face ID to the app although the iPhone
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
      // Only Face ID has a per-app permission; Touch ID has none to refuse.
      return types.includes(facialRecognition) && !hasHardware;
    } catch {
      return false;
    }
  };
}
