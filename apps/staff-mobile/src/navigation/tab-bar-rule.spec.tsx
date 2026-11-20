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

  // Rosa Emma (follow-up 285): the open tab is a 600 pill with a white label;
  // the others stay ink on the white bar. Both labels keep the same weight
  // (`pastilla`) and never shrink under 12 pt.
  it("labels the open tab in white and the others in ink, at one weight", async () => {
    const screen = await openLucia(assistantRoutes());

    const open = screen.getByText("Clientas");
    const closed = screen.getByText("Horario");
    expect(open).toHaveStyle({ color: "#FFFBFB", fontFamily: "WorkSans_700Bold", fontSize: 12 });
    expect(screen.getByTestId("open-tab-pill")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(closed).toHaveStyle({ color: "#93615D", fontFamily: "WorkSans_700Bold", fontSize: 12 });
    for (const label of [open, closed]) {
      expect(label.props.adjustsFontSizeToFit).toBeFalsy();
      expect(label.props.numberOfLines).toBe(1);
    }
  });

  it("hides inside Reservar para…", async () => {
    const screen = await openLucia(assistantRoutes());

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.queryByTestId("tab-clients")).toBeNull();
    });
  });
});
