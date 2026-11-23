import { Platform } from "react-native";

export type BiometricCopy = {
  enabledToast: string;
  offerAction: string;
  offerBody: string;
  switchLabel: string;
  unlockLabel: string;
};

/** Face ID on iOS, the fingerprint («huella») everywhere else. */
export function biometricCopy(os: string = Platform.OS): BiometricCopy {
  if (os === "ios") {
    return {
      enabledToast: "Listo: la próxima vez entras con Face ID.",
      offerAction: "Usar Face ID",
      offerBody: "La próxima vez entra con Face ID, sin escribir tu contraseña.",
      switchLabel: "Entrar con Face ID",
      unlockLabel: "Entrar con Face ID",
    };
  }

  return {
    enabledToast: "Listo: la próxima vez entras con tu huella.",
    offerAction: "Usar mi huella",
    offerBody: "La próxima vez entra con tu huella, sin escribir tu contraseña.",
    switchLabel: "Entrar con huella",
    unlockLabel: "Entrar con tu huella",
  };
}
