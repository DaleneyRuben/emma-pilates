import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

// Walkthrough n.º 6 (C01b3/C01b4's rule): with the keyboard open a pinned
// button covered the form, so «Guardar cambios» ends the form and scrolls
// with it, never on a panel above the keyboard.
describe("Editar perfil layout", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts «Guardar cambios» at the end of the scrolling form", async () => {
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          "/api/v1/accounts/current/email-change": () => jsonResponse({ pending: null }),
        }),
      ),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await waitFor(() => expect(screen.getByText("Editar perfil")).toBeOnTheScreen());

    const form = screen.getByTestId("edit-profile-form");
    expect(within(form).getByRole("button", { name: "Guardar cambios" })).toBeOnTheScreen();
    expect(screen.queryByTestId("footer-panel")).toBeNull();
  });
});
