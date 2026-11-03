import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, upcomingCivilDates } from "@pilates/mobile-core";

import { jsonResponse, studioRules } from "../test-support";
import { assistantRoutes, openLucia, today } from "./assistant-fixtures";

jest.setTimeout(20_000);

async function openBooking(bookingWindowDays: number) {
  const screen = await openLucia({
    ...assistantRoutes(),
    "/api/v1/studio-rules": () => jsonResponse({ ...studioRules, bookingWindowDays }),
  });
  await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
  await waitFor(() => expect(screen.getByTestId("assistant-day-strip")).toBeOnTheScreen());
  return screen;
}

// FIX-026: S07 books for the Client inside the Studio Rule's booking window,
// counting today, as the backend enforces it.
describe("Assistant Reservar booking window (FIX-026)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("offers only the days the booking window allows", async () => {
    const screen = await openBooking(3);
    const dates = upcomingCivilDates(today, 4);

    await waitFor(() =>
      expect(screen.queryByTestId(`assistant-day-${dates[3]}`)).not.toBeOnTheScreen(),
    );
    expect(within(screen.getByTestId("assistant-day-strip")).getAllByRole("button")).toHaveLength(
      3,
    );
    expect(screen.getByTestId(`assistant-day-${dates[2]}`)).toBeOnTheScreen();
  });

  it("keeps the strip at seven days when the window is wider", async () => {
    const screen = await openBooking(14);
    const dates = upcomingCivilDates(today, 8);

    await waitFor(() => expect(screen.getByTestId(`assistant-day-${dates[6]}`)).toBeOnTheScreen());
    expect(screen.queryByTestId(`assistant-day-${dates[7]}`)).not.toBeOnTheScreen();
  });
});
