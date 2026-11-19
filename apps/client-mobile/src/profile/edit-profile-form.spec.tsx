import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, profile, readRoutes } from "./profile-test-support";

// FormB (FIX-089): saving with fields missing or wrong lists them in a Rubor
// box at the top, and each field is marked with its own message.
describe("Editar perfil, FormB", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lists what is missing at the top and marks the field", async () => {
    const saved = jest.fn();
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          "/api/v1/accounts/current/email-change": () => jsonResponse({ pending: null }),
          "PATCH /api/v1/clients/current": () => {
            saved();
            return jsonResponse(profile);
          },
        }),
      ),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await waitFor(() => expect(screen.getByLabelText("Nombre")).toBeOnTheScreen());
    expect(screen.queryByTestId("form-error-summary")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("Nombre"), " ");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "sofia@");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

    const summary = await screen.findByTestId("form-error-summary");
    expect(within(summary).getByText("Faltan 2 datos para guardar")).toBeOnTheScreen();
    expect(within(summary).getByText("Nombre · Correo electrónico")).toBeOnTheScreen();
    expect(summary).toHaveStyle({ backgroundColor: "#E7CCBF" });
    expect(screen.getByText("Escribe tu nombre.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Nombre")).toHaveStyle({ borderWidth: 2 });
    expect(saved).not.toHaveBeenCalled();
  });
});
