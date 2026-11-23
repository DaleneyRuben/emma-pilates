import { biometricCopy } from "./biometric-copy";

describe("biometricCopy", () => {
  it("speaks of Face ID on iOS", () => {
    expect(biometricCopy("ios")).toEqual({
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
