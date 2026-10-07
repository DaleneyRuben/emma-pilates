import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, minute, openLucia, session, soonBooking } from "./assistant-fixtures";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

// MOB-048: the Assistant's reschedule draws 06's option card: the shared
// Session card with the seat pill in the footer instead of the chevron and a
// 2px Palo de rosa border once selected.
describe("Assistant reschedule option card", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  async function openReschedule() {
    const alternativeStart = new Date(new Date(soonBooking.startsAt).getTime() + minute);
    const { from: dayFrom, until: dayUntil } = civilDateRange(boliviaCivilDate(alternativeStart));
    const alternative = {
      ...session,
      id: "session-alt",
      startsAt: alternativeStart.toISOString(),
      endsAt: new Date(alternativeStart.getTime() + 50 * minute).toISOString(),
    };
    const screen = await openLucia({
      ...assistantRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(dayFrom)}&until=${encodeURIComponent(dayUntil)}&limit=100`]:
        () => jsonResponse([alternative]),
    });
    await fireEvent.press(screen.getByRole("button", { name: "Ver reservas" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    // Her Bookings stay mounted under the reschedule with their own Trainer
    // lines, so the assertions stay inside the option card.
    const button = screen.getByRole("button", { name: /^Reformer Pilates \d/ });
    return { button, card: within(button), screen };
  }

  it("draws the option as the frame's card with the seat pill in the footer", async () => {
    const { button, card } = await openReschedule();

    expect(button).toHaveStyle({
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderWidth: 1,
      padding: 18,
    });
    expect(card.getByText(/^\d\d:\d\d – \d\d:\d\d$/)).toHaveStyle({
      color: "#766D69",
      fontSize: 12,
      fontWeight: "500",
      letterSpacing: 1.2,
    });
    expect(card.getByText("Reformer Pilates")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 19,
    });
    expect(card.getByTestId("card-footer")).toHaveStyle({
      borderTopColor: "#EFE7DE",
      paddingTop: 12,
    });
    expect(card.getByTestId("glyph-person", hidden)).toHaveProp("width", 17);
    expect(card.getByText("Emma Vargas")).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(card.getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "#EFE0DC",
      borderRadius: 999,
    });
    expect(card.getByText("6 cupos")).toHaveStyle({
      color: "#7A4F4B",
      fontSize: 12,
      fontWeight: "500",
    });
    expect(card.queryByTestId("chevron", hidden)).toBeNull();
  });

  it("marks the selected option by its 2px Palo de rosa border", async () => {
    const { button, screen } = await openReschedule();

    await fireEvent.press(button);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toHaveProp(
        "accessibilityState",
        { selected: true },
      );
    });
    expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toHaveStyle({
      borderColor: "#B78380",
      borderWidth: 2,
    });
  });
});
