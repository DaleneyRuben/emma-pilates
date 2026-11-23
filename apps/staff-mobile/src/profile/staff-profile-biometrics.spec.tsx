import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const trainer = {
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Centro" }],
};

function biometricRuntime(canUseBiometrics: boolean) {
  const runtime = createStaffRuntime(
    routeFetcher({
      "/api/v1/trainer/sessions": () => jsonResponse([]),
      "/api/v1/staff-members/current": () => jsonResponse(trainer),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    }),
  );
  return {
    ...runtime,
    sessionManager: {
      ...runtime.sessionManager,
      canUseBiometrics: () => canUseBiometrics,
      disableBiometrics: jest.fn().mockResolvedValue(undefined),
      hasBiometricSession: jest.fn().mockResolvedValue(true),
      restore: jest.fn().mockResolvedValue({ accountId: "account-1", role: "trainer" }),
    },
  };
}

async function openProfile(runtime: ReturnType<typeof biometricRuntime>) {
  const screen = await render(<App runtime={runtime} />);
  await waitFor(() => {
    expect(screen.getByTestId("tab-profile")).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeOnTheScreen();
  });
  return screen;
}

// «El interruptor de B» on S23: the switch sits in Ajustes with the account rows.
describe("Staff Perfil biometrics", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("turns Face ID off from Perfil", async () => {
    const runtime = biometricRuntime(true);
    const screen = await openProfile(runtime);

    await waitFor(() => {
      expect(
        screen.getByText("Sirve cualquier cara guardada en el Face ID de este iPhone"),
      ).toBeOnTheScreen();
    });
    await act(async () => {
      await fireEvent(
        screen.getByRole("switch", { name: "Entrar con Face ID" }),
        "valueChange",
        false,
      );
    });

    expect(runtime.sessionManager.disableBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Sin escribir tu contraseña")).toBeOnTheScreen();
  });

  it("leaves the switch out on a phone without biometrics", async () => {
    const screen = await openProfile(biometricRuntime(false));

    expect(screen.queryByRole("switch")).toBeNull();
  });
});
