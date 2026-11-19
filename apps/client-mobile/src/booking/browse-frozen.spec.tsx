import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import {
  addCivilDays,
  boliviaCivilDate,
  civilDateRange,
  clearMobileQueryCache,
} from "@pilates/mobile-core";
import { formatTitleDate } from "@pilates/api-contracts";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const today = boliviaCivilDate(new Date());
const frozenFrom = addCivilDays(today, 1);
const frozenTo = addCivilDays(today, 3);
const backOn = addCivilDays(today, 4);
const dayName = (civil: string) => formatTitleDate(civil).split(" de ")[0]!;

const subscription = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Trimestral 24 clases",
    originalClassAllowance: 24,
    remainingClassAllowance: 20,
    startsOn: addCivilDays(today, -10),
    endsOn: addCivilDays(today, 83),
  },
  freeze: { id: "freeze-1", state: "approved", startsOn: frozenFrom, endsOn: frozenTo },
};

const sessionsPath = (day: string) => {
  const { from, until } = civilDateRange(day);
  return `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;
};
const sessionOn = (id: string, day: string) => ({
  id,
  branchId: "branch-centro",
  classTypeId: "class-mat",
  trainerStaffMemberId: "trainer-1",
  classTypeName: "Mat Pilates",
  trainerName: "Daniela Ortiz",
  trainerPhoto: null,
  startsAt: `${day}T23:00:00.000Z`,
  endsAt: `${day}T23:50:00.000Z`,
  capacity: 8,
  bookedCount: 3,
  availableSeats: 5,
  waitlistCount: 0,
  classesLeftThisWeek: null,
});

async function openBrowse() {
  const routes: Record<string, () => Response> = {
    "/api/v1/clients/current": () =>
      jsonResponse({
        id: "client-1",
        name: "Carla Méndez",
        email: "carla@example.com",
        phone: "+59170000000",
        referralCode: "REF-CARLA",
      }),
    "/api/v1/clients/current/subscription": () => jsonResponse(subscription),
    "/api/v1/branches": () =>
      jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" }]),
    "/api/v1/class-types": () =>
      jsonResponse([
        { id: "class-mat", name: "Mat Pilates", description: "", durationMinutes: 50 },
      ]),
  };
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addCivilDays(today, offset);
    routes[sessionsPath(day)] = () => jsonResponse([sessionOn(`s-${offset}`, day)]);
  }
  const screen = await render(<App runtime={createClientRuntime(routeFetcher(routes))} />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
  await waitFor(() => expect(screen.getByTestId(`browse-day-${frozenFrom}`)).toBeOnTheScreen());
  return screen;
}

// C1 (owner 2026-11-19, pick D = B + C): on Reservar a frozen day says so on
// its chip, explains the Freeze and offers the first day she can book, with
// no greyed-out classes.
describe("Client Reservar on a frozen day", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // The 12 pt floor leaves no room for «congelado» on a phone chip, so the
  // chip carries a lock and says it aloud; one line under the days names them.
  it("marks each frozen day on its chip, on Crema, never a Rubor fill", async () => {
    const screen = await openBrowse();

    for (const day of [frozenFrom, addCivilDays(today, 2), frozenTo]) {
      const chip = screen.getByTestId(`browse-day-${day}`);
      expect(within(chip).getByTestId("glyph-lock", hidden)).toBeTruthy();
      expect(chip.props.accessibilityLabel).toMatch(/, congelado$/);
      expect(chip).toHaveStyle({ backgroundColor: "#F9F4F2" });
    }
    const after = screen.getByTestId(`browse-day-${backOn}`);
    expect(within(after).queryByTestId("glyph-lock", hidden)).toBeNull();
    expect(screen.getByTestId("browse-frozen-legend")).toHaveTextContent(/^Plan congelado del /);
  });

  it("explains the frozen day instead of its classes and offers the day she is back", async () => {
    const screen = await openBrowse();

    await fireEvent.press(screen.getByTestId(`browse-day-${frozenFrom}`));

    const card = await screen.findByTestId("browse-frozen-day");
    expect(within(card).getByText(`${dayName(frozenFrom)}: plan congelado`)).toBeOnTheScreen();
    expect(within(card).getByText(/^Pediste congelar tu plan del /)).toBeOnTheScreen();
    expect(within(card).getByText(/Tu plan ahora vence el /)).toBeOnTheScreen();
    expect(screen.queryByTestId("session-card-s-1")).toBeNull();

    await fireEvent.press(
      within(card).getByRole("button", {
        name: `Ver clases del ${dayName(backOn).toLowerCase()}`,
      }),
    );

    await waitFor(() => expect(screen.getByTestId(`browse-day-${backOn}`)).toBeSelected());
    expect(screen.queryByTestId("browse-frozen-day")).toBeNull();
    expect(await screen.findByTestId("session-card-s-4")).toBeOnTheScreen();
  });

  it("opens Mi plan from «Ver mi congelamiento»", async () => {
    const screen = await openBrowse();
    await fireEvent.press(screen.getByTestId(`browse-day-${frozenTo}`));

    await fireEvent.press(await screen.findByRole("button", { name: "Ver mi congelamiento" }));

    expect(await screen.findByText("Mi plan")).toBeOnTheScreen();
  });

  it("books normally on a day outside the Freeze", async () => {
    const screen = await openBrowse();

    expect(screen.queryByTestId("browse-frozen-day")).toBeNull();
    expect(await screen.findByTestId("session-card-s-0")).toBeOnTheScreen();
  });
});
