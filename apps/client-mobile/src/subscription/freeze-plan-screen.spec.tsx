import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { dayMonth } from "./freeze-window";

// Walkthrough finding 51 (DES-015, follow-up 259 A): Congelar plan picks the
// dates on a month calendar, says «hasta 15 días» and the moved end, refuses
// what the backend refuses before sending, and names a server refusal.
// Every date is relative to today, so the spec holds on any day.
const today = boliviaCivilDate(new Date());
const termEndsOn = addCivilDays(today, 83);
const start = addCivilDays(today, 8);
const end = addCivilDays(start, 6);

const view = (extra: Record<string, unknown> = {}) => ({
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Trimestral 36 clases",
    originalClassAllowance: 36,
    remainingClassAllowance: 30,
    startsOn: addCivilDays(today, -6),
    endsOn: termEndsOn,
  },
  nextSubscription: null,
  freeze: null,
  canRequestFreeze: true,
  ...extra,
});

const monthsFromToday = (day: string) =>
  (Number(day.slice(0, 4)) - Number(today.slice(0, 4))) * 12 +
  Number(day.slice(5, 7)) -
  Number(today.slice(5, 7));

async function openFreeze(routes: Parameters<typeof routeFetcher>[0]) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () =>
      jsonResponse({ id: "client-1", name: "Carla Ríos", email: "carla@example.com" }),
    ...routes,
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^Mi plan/ })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: /^Mi plan/ }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^Congelar plan/ })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: /^Congelar plan/ }));
  await waitFor(() => {
    expect(screen.getByRole("header", { name: "Congelar plan" })).toBeOnTheScreen();
  });
  return { fetcher, screen };
}

// The calendar reads each day to a screen reader as «vie 16 de octubre».
const calendarMonth = new Intl.DateTimeFormat("es-BO", { month: "long", timeZone: "UTC" });
const calendarDay = (day: string) =>
  `${Number(day.slice(8))} de ${calendarMonth.format(new Date(`${day}T12:00:00.000Z`))}`;

async function pressDay(
  screen: Awaited<ReturnType<typeof render>>,
  day: string,
  shown: { month: number },
) {
  while (shown.month < monthsFromToday(day)) {
    await fireEvent.press(screen.getByRole("button", { name: "Mes siguiente" }));
    shown.month += 1;
  }
  await fireEvent.press(
    screen.getByRole("button", { name: new RegExp(`^\\S+ ${calendarDay(day)}`) }),
  );
}

describe("Congelar plan", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("picks a range, shows the days and the moved end, and sends it", async () => {
    let current = view();
    const requests: unknown[] = [];
    const { screen } = await openFreeze({
      "/api/v1/clients/current/subscription": () => jsonResponse(current),
      "POST /api/v1/freezes": (init) => {
        requests.push(JSON.parse(String(init?.body)));
        current = view({
          freeze: { id: "freeze-1", state: "requested", startsOn: start, endsOn: end },
          canRequestFreeze: false,
        });
        return jsonResponse({ id: "freeze-1", state: "requested" }, 201);
      },
    });

    expect(screen.getByText(/hasta 15 días/)).toBeOnTheScreen();
    // FormB (FIX-089): sending early lists what is missing at the top.
    await fireEvent.press(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(
      within(screen.getByTestId("form-error-summary")).getByText("Faltan 2 datos para guardar"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Fechas · Motivo")).toBeOnTheScreen();
    expect(screen.getByText("Falta este dato")).toBeOnTheScreen();

    const shown = { month: 0 };
    await pressDay(screen, start, shown);
    await pressDay(screen, end, shown);

    expect(screen.getByText("7 días")).toBeOnTheScreen();
    expect(screen.getByText(dayMonth(addCivilDays(termEndsOn, 7)))).toBeOnTheScreen();
    expect(screen.getByText(`antes, el ${dayMonth(termEndsOn)}`)).toBeOnTheScreen();
    const left = within(screen.getByTestId("form-error-summary"));
    expect(left.getByText("Falta 1 dato para guardar")).toBeOnTheScreen();
    expect(left.getByText("Motivo")).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Motivo"), "Viaje familiar");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => {
      expect(screen.getByText(/^En revisión · /)).toBeOnTheScreen();
    });
    expect(requests).toHaveLength(1);
    expect(requests).toEqual([
      { subscriptionId: "subscription-1", startsOn: start, endsOn: end, reason: "Viaje familiar" },
    ]);
  });

  it("explains a day past the 15th instead of picking it", async () => {
    const { screen } = await openFreeze({
      "/api/v1/clients/current/subscription": () => jsonResponse(view()),
    });

    const shown = { month: 0 };
    await pressDay(screen, start, shown);
    await pressDay(screen, addCivilDays(start, 15), shown);

    expect(
      screen.getByText(
        `Puedes congelar hasta 15 días: el último día posible es el ${dayMonth(addCivilDays(start, 14))}.`,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("16 días")).toBeNull();
  });

  it("names what failed when the server refuses after a next plan was bought", async () => {
    let current: Record<string, unknown> = view();
    const { screen } = await openFreeze({
      "/api/v1/clients/current/subscription": () => jsonResponse(current),
      "POST /api/v1/freezes": () => {
        current = view({ queuedPlanStartsOn: addCivilDays(termEndsOn, 1) });
        return jsonResponse({ code: "freeze_not_allowed", status: 409 }, 409);
      },
    });

    const shown = { month: 0 };
    await pressDay(screen, start, shown);
    await pressDay(screen, end, shown);
    await fireEvent.changeText(screen.getByLabelText("Motivo"), "Viaje");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar solicitud" }));

    // Mi plan, under this task, says it too: check the alert on this screen.
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        `Tu plan siguiente empieza el ${dayMonth(addCivilDays(termEndsOn, 1))}, al día siguiente de que vence este: ya no se puede congelar.`,
      );
    });
  });
});
