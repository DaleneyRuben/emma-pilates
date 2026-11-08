import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { dayMonth, freezeRange, weekdayDayMonth } from "./freeze-window";

// Walkthrough findings 51, 53 and 54 (DES-015, follow-up 259 A): Mi plan
// keeps the plan card as its one colour, shows the Freeze as a card in each
// state instead of a loose line, and lets the Client withdraw a request.
const today = boliviaCivilDate(new Date());
const termEndsOn = addCivilDays(today, 83);

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

async function openMiPlan(routes: Parameters<typeof routeFetcher>[0]) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () =>
      jsonResponse({ id: "client-1", name: "Carla Ríos", email: "carla@example.com" }),
    ...routes,
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Mi plan" })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: "Mi plan" }));
  await waitFor(() => {
    expect(screen.getByTestId("subscription-hero")).toBeOnTheScreen();
  });
  return screen;
}

describe("Mi plan with a Freeze", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows a request in review with its dates and new end, and withdraws it", async () => {
    const start = addCivilDays(today, 8);
    const end = addCivilDays(start, 6);
    let current: Record<string, unknown> = view({
      freeze: { id: "freeze-1", state: "requested", startsOn: start, endsOn: end },
      canRequestFreeze: false,
    });
    const withdrawn: string[] = [];
    const screen = await openMiPlan({
      "/api/v1/clients/current/subscription": () => jsonResponse(current),
      "POST /api/v1/freezes/freeze-1/withdrawal": () => {
        withdrawn.push("freeze-1");
        current = view({
          freeze: { id: "freeze-1", state: "withdrawn", startsOn: start, endsOn: end },
        });
        return jsonResponse({ state: "withdrawn" });
      },
    });

    expect(screen.getByText("En revisión")).toBeOnTheScreen();
    expect(screen.getByText(freezeRange(start, end))).toBeOnTheScreen();
    expect(screen.getByText("Tu plan vencería el")).toBeOnTheScreen();
    expect(screen.getByText(weekdayDayMonth(addCivilDays(termEndsOn, 7)))).toBeOnTheScreen();
    expect(screen.queryByText("Tu solicitud de congelamiento está en revisión.")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Congelar plan/ })).toBeNull();

    // Owner 2026-11-08 («LO APRUEBO»): a discreet link, a sheet like
    // «¿Cerrar sesión?», then the freeze row again and a toast.
    await fireEvent.press(screen.getByRole("button", { name: "Retirar solicitud" }));
    await waitFor(() => {
      expect(screen.getByText("¿Retirar tu solicitud?")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        `Tu plan sigue igual y vence el ${dayMonth(termEndsOn)}. Puedes pedir otro congelamiento después.`,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Volver" })).toBeOnTheScreen();
    const confirm = screen.getAllByRole("button", { name: "Retirar solicitud" });
    await fireEvent.press(confirm[confirm.length - 1]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Congelar plan/ })).toBeOnTheScreen();
    });
    expect(screen.getByText("Retiramos tu solicitud")).toBeOnTheScreen();
    expect(withdrawn).toEqual(["freeze-1"]);
    expect(screen.queryByText("En revisión")).toBeNull();
  });

  it("says «Congelado del … al …» before an approved Freeze starts", async () => {
    const start = addCivilDays(today, 1);
    const end = addCivilDays(start, 6);
    const screen = await openMiPlan({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse(
          view({
            subscription: { ...view().subscription, endsOn: addCivilDays(termEndsOn, 7) },
            freeze: { id: "freeze-1", state: "approved", startsOn: start, endsOn: end },
            canRequestFreeze: false,
          }),
        ),
    });

    expect(screen.getByText("Aprobado")).toBeOnTheScreen();
    expect(
      screen.getByText(`Congelado ${freezeRange(start, end).toLowerCase()}`),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ahora vence el")).toBeOnTheScreen();
    expect(screen.queryByText(/está congelado hasta/)).toBeNull();
  });

  it("says «Congelado hasta …» while the Freeze runs", async () => {
    const start = addCivilDays(today, -2);
    const end = addCivilDays(today, 4);
    const screen = await openMiPlan({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse(
          view({
            freeze: { id: "freeze-1", state: "approved", startsOn: start, endsOn: end },
            canRequestFreeze: false,
          }),
        ),
    });

    expect(screen.getByText("Congelado")).toBeOnTheScreen();
    expect(screen.getByText(`Congelado hasta el ${weekdayDayMonth(end)}`)).toBeOnTheScreen();
    expect(screen.getByText(weekdayDayMonth(addCivilDays(end, 1)))).toBeOnTheScreen();
  });

  it("shows a refused request and offers another", async () => {
    const start = addCivilDays(today, 8);
    const screen = await openMiPlan({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse(
          view({
            freeze: {
              id: "freeze-1",
              state: "refused",
              startsOn: start,
              endsOn: addCivilDays(start, 4),
            },
          }),
        ),
    });

    expect(screen.getByText("No aprobado")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Pedir otro congelamiento/ })).toBeOnTheScreen();
  });

  it("turns the freeze row off when the next plan starts the day after", async () => {
    const screen = await openMiPlan({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse(view({ queuedPlanStartsOn: addCivilDays(termEndsOn, 1) })),
    });

    expect(
      screen.getByText(
        `Tu plan siguiente empieza el ${dayMonth(addCivilDays(termEndsOn, 1))}, al día siguiente de que vence este: ya no se puede congelar.`,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Congelar plan/ })).toBeNull();
  });

  it("keeps one focus: notices without a fill and no bottom booking button", async () => {
    const screen = await openMiPlan({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse(view({ founderRenewalDeadline: addCivilDays(termEndsOn, 8) })),
    });

    expect(
      screen.getByText(
        `Renueva antes del ${dayMonth(addCivilDays(termEndsOn, 8))} para mantener tu 15 % de descuento.`,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("subscription-notices")).not.toHaveStyle({
      backgroundColor: "#F2E4E1",
    });
    expect(screen.queryByRole("button", { name: "Reservar una clase" })).toBeNull();
  });

  it("names a one-day approved Freeze by its day", async () => {
    const day = addCivilDays(today, 3);
    const screen = await openMiPlan({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse(
          view({
            freeze: { id: "freeze-1", state: "approved", startsOn: day, endsOn: day },
            canRequestFreeze: false,
          }),
        ),
    });

    expect(screen.getByText(`Congelado el ${weekdayDayMonth(day)}`)).toBeOnTheScreen();
  });

  it("re-reads the plan when the request was decided before the withdrawal", async () => {
    const start = addCivilDays(today, 8);
    const end = addCivilDays(start, 6);
    let current: Record<string, unknown> = view({
      freeze: { id: "freeze-1", state: "requested", startsOn: start, endsOn: end },
      canRequestFreeze: false,
    });
    const screen = await openMiPlan({
      "/api/v1/clients/current/subscription": () => jsonResponse(current),
      "POST /api/v1/freezes/freeze-1/withdrawal": () => {
        current = view({
          freeze: { id: "freeze-1", state: "approved", startsOn: start, endsOn: end },
          canRequestFreeze: false,
        });
        return jsonResponse({ code: "freeze_already_decided", status: 409 }, 409);
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "Retirar solicitud" }));
    const confirm = await screen.findAllByRole("button", { name: "Retirar solicitud" });
    await fireEvent.press(confirm[confirm.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("Aprobado")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("La administración ya decidió tu solicitud. Mira cómo quedó."),
    ).toBeOnTheScreen();
  });
});
