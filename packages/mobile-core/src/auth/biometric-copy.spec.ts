import { biometricCopy } from "./biometric-copy";

describe("biometricCopy", () => {
  it("speaks of Face ID on iOS", () => {
    expect(biometricCopy("ios")).toEqual({
      enabledToast: "Listo: la próxima vez entras con Face ID.",
      offerAction: "Usar Face ID",
      offerBody: "La próxima vez entra con Face ID, sin escribir tu contraseña.",
      switchLabel: "Entrar con Face ID",
      unlockLabel: "Entrar con Face ID",
    });
  });

  it("speaks of the fingerprint everywhere else", () => {
    expect(biometricCopy("android")).toEqual({
      enabledToast: "Listo: la próxima vez entras con tu huella.",
      offerAction: "Usar mi huella",
      offerBody: "La próxima vez entra con tu huella, sin escribir tu contraseña.",
      switchLabel: "Entrar con huella",
      unlockLabel: "Entrar con tu huella",
    });
  });
});
