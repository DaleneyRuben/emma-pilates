import { Platform } from "react-native";

export type BiometricCopy = {
  /** The system refuses them to the app: the alert that leads to Settings. */
  blocked: { action: string; message: string; title: string };
  enabledToast: string;
  glyph: "faceId" | "fingerprint";
  offerAction: string;
  offerTitle: string;
  /** Under «Hola de nuevo» on Android (canvas B); iOS-3 shows none. */
  otherAccountNote: string | null;
  switchLabel: string;
  switchOnNote: string;
  unlockLabel: string;
};

/** Face ID on iOS, the fingerprint («huella») everywhere else. */
export function biometricCopy(os: string = Platform.OS): BiometricCopy {
  if (os === "ios") {
    return {
      blocked: {
        action: "Abrir Ajustes",
        message: "Para entrar con Face ID, permite que la app lo use en Ajustes.",
        title: "Face ID está desactivado",
      },
      enabledToast: "Listo: la próxima vez entras con Face ID.",
      glyph: "faceId",
      offerAction: "Usar Face ID",
      offerTitle: "¿Entrar con Face ID?",
      otherAccountNote: null,
      switchLabel: "Entrar con Face ID",
      switchOnNote: "Sirve cualquier cara guardada en el Face ID de este iPhone",
      unlockLabel: "Entrar con Face ID",
    };
  }

  return {
    blocked: {
      action: "Abrir ajustes",
      message: "Para entrar con tu huella, guarda una en los ajustes de seguridad del celular.",
      title: "Tu huella no está disponible",
    },
    enabledToast: "Listo: la próxima vez entras con tu huella.",
    glyph: "fingerprint",
    offerAction: "Usar mi huella",
    offerTitle: "¿Entrar con tu huella?",
    otherAccountNote: "«Usar otra cuenta» quita la huella de este celular.",
    switchLabel: "Entrar con huella",
    switchOnNote: "Sirve cualquier huella guardada en este celular",
    unlockLabel: "Entrar con tu huella",
  };
}
