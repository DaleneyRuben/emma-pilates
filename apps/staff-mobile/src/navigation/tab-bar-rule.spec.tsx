import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { assistantRoutes, openLucia } from "../assistant/assistant-fixtures";

jest.setTimeout(20_000);

// Design follow-up 254 § 3 (owner, 2026-11-06): the bar stays while browsing
// (the client file, her reservas) and hides only inside a task (Registrar
// pago, Reservar para…).
describe("Staff tab bar", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("stays on the client file and hides inside Registrar pago", async () => {
    const screen = await openLucia(assistantRoutes());

    expect(screen.getByTestId("tab-clients")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() => {
      expect(screen.queryByTestId("tab-clients")).toBeNull();
    });
  });

  it("hides inside Reservar para…", async () => {
    const screen = await openLucia(assistantRoutes());

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.queryByTestId("tab-clients")).toBeNull();
    });
  });
});
