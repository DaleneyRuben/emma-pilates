import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, studioRules } from "../test-support";
import { assistantRoutes, openLucia } from "./assistant-fixtures";

jest.setTimeout(20_000);

// BKM-004 (ADR-0101): S21 reads the Cancellation Window from GET /studio-rules,
// so the Assistant sees the same edge as the API when the setting changes.
describe("Assistant Client Bookings and the Studio Settings", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  const openBookings = async (rules: () => Response) => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/studio-rules": rules,
    });
    await fireEvent.press(screen.getByRole("button", { name: "Ver reservas" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Reservas de la clienta")).toBeOnTheScreen();
    });
    return screen;
  };

  it("offers only Reprogramar for both Bookings inside a 30-hour window", async () => {
    const screen = await openBookings(() =>
      jsonResponse({ ...studioRules, cancellationWindowMinutes: 30 * 60 }),
    );

    await waitFor(() => {
      expect(screen.getAllByText("No cancelable")).toHaveLength(2);
    });
    expect(screen.getAllByRole("button", { name: "Reprogramar" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeOnTheScreen();
  });

  it("offers neither action while the window is unknown", async () => {
    const screen = await openBookings(() => jsonResponse({}, 503));

    await waitFor(() => {
      expect(screen.getByText("En lista de espera")).toBeOnTheScreen();
    });
    expect(screen.queryByText("No cancelable")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reprogramar" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeOnTheScreen();
  });
});
