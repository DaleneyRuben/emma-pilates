import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, upcomingCivilDates } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher, studioRules } from "../test-support";
import { assistantRoutes, today } from "./assistant-fixtures";

jest.setTimeout(20_000);

type Routes = Parameters<typeof routeFetcher>[0];

// The rules may answer late, so a spec can choose a day before the window is
// known.
async function openBooking(bookingWindowDays: number | Promise<number>, routes: Routes = {}) {
  const base = routeFetcher({ ...assistantRoutes(), ...routes });
  const fetcher = ((input: RequestInfo | URL, init?: RequestInit) =>
    String(input) === "/api/v1/studio-rules"
      ? Promise.resolve(bookingWindowDays).then((days) =>
          jsonResponse({ ...studioRules, bookingWindowDays: days }),
        )
      : base(input, init)) as typeof globalThis.fetch;
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "assistant")} />);
  await waitFor(() => expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen());
  await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }));
  await waitFor(() => expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen());
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

  it("goes back to today when the window turns out shorter than the chosen day", async () => {
    let answer: (days: number) => void = () => undefined;
    const screen = await openBooking(new Promise<number>((resolve) => (answer = resolve)));
    const sixthDay = upcomingCivilDates(today, 6)[5];

    await fireEvent.press(screen.getByTestId(`assistant-day-${sixthDay}`));
    await answer(3);

    await waitFor(() =>
      expect(screen.queryByTestId(`assistant-day-${sixthDay}`)).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(`assistant-day-${today}`)).toHaveProp("accessibilityState", {
      selected: true,
    });
  });

  it("names a booking the window refuses", async () => {
    const screen = await openBooking(7, {
      "POST /api/v1/sessions/session-1/bookings": () =>
        jsonResponse({ code: "booking_window_exceeded", status: 409 }, 409),
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    await waitFor(() => expect(screen.getByText("cupos libres de 12")).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole("button", { name: "Reservar para Lucía" }));

    await waitFor(() =>
      expect(screen.getByText("Esa clase todavía no abre para reservar.")).toBeOnTheScreen(),
    );
  });
});
