import { act, cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { createClientRuntime, routeFetcher } from "../test-support";
import { openProfile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

function biometricRuntime(canUseBiometrics: boolean) {
  const runtime = createClientRuntime(routeFetcher(readRoutes));
  return {
    ...runtime,
    sessionManager: {
      ...runtime.sessionManager,
      canUseBiometrics: () => canUseBiometrics,
      enableBiometrics: jest.fn().mockResolvedValue(true),
    },
  };
}

// «El interruptor de B»: Perfil › Cuenta turns biometrics on for this phone.
describe("Client Perfil biometrics", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("turns Face ID on from Cuenta and confirms it", async () => {
    const runtime = biometricRuntime(true);
    const screen = await openProfile(runtime);

    const toggle = screen.getByRole("switch", { name: "Entrar con Face ID" });
    expect(screen.getByText("Sin escribir tu contraseña")).toBeOnTheScreen();
    await act(async () => {
      await fireEvent(toggle, "valueChange", true);
    });

    expect(runtime.sessionManager.enableBiometrics).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText("Activado en este celular")).toBeOnTheScreen();
    });
    expect(screen.getByText("Listo: la próxima vez entras con Face ID.")).toBeOnTheScreen();
  });

  it("leaves the switch out on a phone without biometrics", async () => {
    const screen = await openProfile(biometricRuntime(false));

    expect(screen.queryByRole("switch")).toBeNull();
  });
});
