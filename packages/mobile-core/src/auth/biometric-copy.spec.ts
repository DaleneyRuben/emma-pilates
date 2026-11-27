import { biometricCopy } from "./biometric-copy";

describe("biometricCopy", () => {
  it("speaks of Face ID on iOS", () => {
    expect(biometricCopy("ios")).toEqual({
      blocked: {
        action: "Abrir Ajustes",
        message: "Para entrar con Face ID, permite que la app lo use en Ajustes.",
        title: "Face ID está desactivado",
      },
      unavailable: {
        message: "Revisa Face ID en los ajustes del iPhone e intenta de nuevo.",
        title: "Face ID no está disponible",
      },
      enabledToast: "Listo: la próxima vez entras con Face ID.",
      glyph: "faceId",
      offerAction: "Usar Face ID",
      offerTitle: "¿Entrar con Face ID?",
      otherAccountNote: null,
      switchLabel: "Entrar con Face ID",
      switchOnNote: "Sirve cualquier cara guardada en el Face ID de este iPhone",
      unlockLabel: "Entrar con Face ID",
    });
  });

  it("speaks of the fingerprint everywhere else", () => {
    expect(biometricCopy("android")).toEqual({
      blocked: {
        action: "Abrir ajustes",
        message: "Para entrar con tu huella, guarda una en los ajustes de seguridad del celular.",
        title: "Tu huella no está disponible",
      },
      unavailable: null,
      enabledToast: "Listo: la próxima vez entras con tu huella.",
      glyph: "fingerprint",
      offerAction: "Usar mi huella",
      offerTitle: "¿Entrar con tu huella?",
      otherAccountNote: "«Usar otra cuenta» quita la huella de este celular.",
      switchLabel: "Entrar con huella",
      switchOnNote: "Sirve cualquier huella guardada en este celular",
      unlockLabel: "Entrar con tu huella",
    });
  });
});
