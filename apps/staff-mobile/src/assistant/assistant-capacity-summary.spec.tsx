import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia, sessionDetail } from "./assistant-fixtures";

jest.setTimeout(20_000);

// MOB-048: S08 replaces the capacity bar with its frame's summary box: «N de
// M cupos disponibles» beside the seat pill («Con cupos» or «Completa») in a
// flat Blanco card (follow-up 87), with no bar and no label above it.
describe("Assistant Session detail capacity summary", () => {
  afterEach(() => {
    cleanup();
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

  it("draws the seats beside a «Con cupos» pill in a flat Blanco box, with no bar", async () => {
    const { box, screen, summary } = await openDetail(sessionDetail);

    expect(box).toHaveStyle({
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 16,
    });
    expect(summary.getByText("6 de 12 cupos disponibles")).toHaveStyle({
      color: "#4A4A4A",
      fontSize: 15,
    });
    expect(summary.getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "#EFE0DC",
      borderRadius: 999,
    });
    expect(summary.getByText("Con cupos")).toHaveStyle({
      color: "#7A4F4B",
      fontSize: 12,
      fontWeight: "500",
    });
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText("Cupos disponibles")).toBeNull();
  });

  it("reads «0 de M cupos disponibles» beside a neutral «Completa» pill when full", async () => {
    const { screen, summary } = await openDetail({
      ...sessionDetail,
      bookedCount: 12,
      availableSeats: 0,
    });

    expect(summary.getByText("0 de 12 cupos disponibles")).toBeOnTheScreen();
    expect(summary.getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.34)",
    });
    expect(summary.getByText("Completa")).toHaveStyle({ color: "#6E6663", fontSize: 12 });
    expect(screen.queryByText("Lleno")).toBeNull();
    expect(screen.getByRole("button", { name: "Unirme a la lista de espera" })).toBeOnTheScreen();
  });
});
