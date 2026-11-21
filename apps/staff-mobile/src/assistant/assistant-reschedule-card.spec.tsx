import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import {
  boliviaCivilDate,
  civilDateRange,
  clearMobileQueryCache,
  textVariants,
} from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, minute, openLucia, session, soonBooking } from "./assistant-fixtures";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

// MOB-048, E-R12: the Assistant's reschedule draws each option as the class
// row on its own white card (type bar, Lora start time), the free seats as a
// pill instead of the chevron, and a 2px 600 ring once selected.
describe("Assistant reschedule option card", () => {
  afterEach(async () => {
    await cleanup();
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
    await fireEvent.press(screen.getByTestId("client-overview-bookings"));
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

  it("draws the option as the class row on its own card with the seats as a pill", async () => {
    const { button, card } = await openReschedule();

    expect(button).toHaveStyle({ borderColor: "transparent", borderWidth: 2 });
    expect(card.getByTestId("class-row-time")).toHaveTextContent(/^\d\d:\d\d$/);
    expect(card.getByTestId("class-row-time")).toHaveStyle(textVariants.cifra);
    expect(card.getByText("Reformer Pilates")).toHaveStyle({ color: "#93615D" });
    // The owner's pick C: her name only, without her face or initials.
    expect(card.queryByText("EV")).toBeNull();
    expect(card.getByText("Emma Vargas")).toHaveStyle({ color: "#93615D" });
    expect(card.getByTestId("exception-pill")).toHaveStyle({ backgroundColor: "#FEF6F2" });
    expect(card.getByText("6 lugares libres")).toBeOnTheScreen();
    expect(card.queryByTestId("chevron", hidden)).toBeNull();
  });

  it("marks the selected option by its 2px 600 ring", async () => {
    const { button, screen } = await openReschedule();

    await fireEvent.press(button);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toHaveProp(
        "accessibilityState",
        { selected: true },
      );
    });
    expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toHaveStyle({
      borderColor: "#93615D",
      borderWidth: 2,
    });
  });
});
