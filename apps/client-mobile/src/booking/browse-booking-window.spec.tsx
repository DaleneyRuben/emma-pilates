import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache, upcomingCivilDates } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher, studioRules } from "../test-support";

jest.setTimeout(20_000);

const routes = {
  "/api/v1/clients/current": () =>
    jsonResponse({
      id: "client-1",
      name: "Lucía Fernández",
      email: "lucia@example.com",
      phone: null,
      referralCode: "REF-LUCIA",
    }),
  "/api/v1/clients/current/subscription": () => jsonResponse({ status: "none" }),
  "/api/v1/branches": () =>
    jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" }]),
  "/api/v1/class-types": () => jsonResponse([]),
};

async function openBrowse(bookingWindowDays: number | Promise<number>) {
  const base = routeFetcher(routes);
  // The rules may answer late, so a spec can choose a day before the window
  // is known.
  const fetcher = ((input: RequestInfo | URL, init?: RequestInit) =>
    String(input) === "/api/v1/studio-rules"
      ? Promise.resolve(bookingWindowDays).then((days) =>
          jsonResponse({ ...studioRules, bookingWindowDays: days }),
        )
      : base(input, init)) as typeof globalThis.fetch;
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen(),
    {
      timeout: 10_000,
    },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
  await waitFor(() => expect(screen.getByTestId("browse-day-strip")).toBeOnTheScreen());
  return screen;
}

// FIX-026: the strip reads the Studio Rule's booking window, counting today,
// instead of a fixed week.
describe("Client Reservar booking window (FIX-026)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("offers only the days the booking window allows", async () => {
    const screen = await openBrowse(3);
    const dates = upcomingCivilDates(boliviaCivilDate(new Date()), 4);

    await waitFor(() =>
      expect(screen.queryByTestId(`browse-day-${dates[3]}`)).not.toBeOnTheScreen(),
    );
    const strip = within(screen.getByTestId("browse-day-strip"));
    expect(strip.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByTestId(`browse-day-${dates[2]}`)).toBeOnTheScreen();
  });

  it("keeps the strip at seven days when the window is wider", async () => {
    const screen = await openBrowse(14);
    const dates = upcomingCivilDates(boliviaCivilDate(new Date()), 8);

    await waitFor(() => expect(screen.getByTestId(`browse-day-${dates[6]}`)).toBeOnTheScreen());
    expect(screen.queryByTestId(`browse-day-${dates[7]}`)).not.toBeOnTheScreen();
  });

  it("goes back to today when the window turns out shorter than the chosen day", async () => {
    let answer: (days: number) => void = () => undefined;
    const screen = await openBrowse(new Promise<number>((resolve) => (answer = resolve)));
    const [today, , , , , sixthDay] = upcomingCivilDates(boliviaCivilDate(new Date()), 6);

    await fireEvent.press(screen.getByTestId(`browse-day-${sixthDay}`));
    await answer(3);

    await waitFor(() =>
      expect(screen.queryByTestId(`browse-day-${sixthDay}`)).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(`browse-day-${today}`)).toHaveProp("accessibilityState", {
      selected: true,
    });
  });
});
