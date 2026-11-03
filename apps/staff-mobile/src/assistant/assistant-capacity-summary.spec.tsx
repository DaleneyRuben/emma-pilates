import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia, sessionDetail } from "./assistant-fixtures";

jest.setTimeout(20_000);

// MOB-048: S08 replaces the capacity bar with its frame's summary box: «N de
// M cupos disponibles» beside the seat pill («Con cupos» or «Completa») in a
// flat Blanco card (follow-up 87), with no bar and no label above it.
describe("Assistant Session detail capacity summary", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  async function openDetail(detail: typeof sessionDetail) {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/sessions/session-1": () => jsonResponse(detail),
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    await waitFor(() => {
      expect(screen.getByTestId("capacity-summary")).toBeOnTheScreen();
    });
    // S07 stays mounted under the detail with its own seat pills, so the
    // assertions stay inside the box.
    const box = screen.getByTestId("capacity-summary");
    return { box, screen, summary: within(box) };
  }

  // v2 S08: the class is the screen's hero, the free seats in Lora 32 over a bar.
  it("puts the free seats on the Rosa profundo hero with its progress bar", async () => {
    const { box, screen, summary } = await openDetail(sessionDetail);

    expect(box).toHaveStyle({ backgroundColor: "#93615D", borderRadius: 20 });
    expect(summary.getByText("6")).toHaveStyle({ fontSize: 32 });
    expect(summary.getByText("cupos libres de 12")).toBeOnTheScreen();
    expect(summary.getByTestId("capacity-bar")).toBeOnTheScreen();
    expect(
      screen.getByText("Se descuenta 1 clase de su plan. Le avisamos por notificación."),
    ).toBeOnTheScreen();
  });

  it("marks a full class «Completa» and offers the waiting list", async () => {
    const { screen, summary } = await openDetail({
      ...sessionDetail,
      bookedCount: 12,
      availableSeats: 0,
      waitlistCount: 2,
    });

    expect(summary.getByText("0")).toBeOnTheScreen();
    expect(summary.getByText("cupos libres de 12 · 2 en espera")).toBeOnTheScreen();
    expect(summary.getByText("Completa")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Anotarla en la lista de espera" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Si se libera un cupo, le avisamos a Lucía.")).toBeOnTheScreen();
  });
});
