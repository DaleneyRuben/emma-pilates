import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  baseRoutes,
  boliviaInstant,
  civilDateIn,
  dayName,
  day,
  openProfileRow,
  page,
  secondDay,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

// Walkthrough finding 70 (follow-up 264, option A): one «Evaluación
// nutricional» with the next Evaluation on top, the slots below and
// «Anteriores» at the foot.
const nextStart = boliviaInstant(civilDateIn(6), "09:00");
const paid = (overrides: Record<string, unknown> = {}) =>
  upcomingEvaluation("evaluation-paid", nextStart, {
    included: false,
    priceCentavos: 7_000,
    paymentId: "payment-1",
    receiptAttached: true,
    cancellable: false,
    reschedulable: true,
    paymentState: "confirmed",
    ...overrides,
  });
const pastEvaluation = upcomingEvaluation("evaluation-past", new Date(Date.now() - 30 * day), {
  state: "completed",
  cancellable: false,
});

const fetcherWith = (upcoming: unknown[], extra: Parameters<typeof routeFetcher>[0] = {}) =>
  routeFetcher({
    ...baseRoutes(),
    "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page(upcoming)),
    "/api/v1/evaluations?scope=past": () => jsonResponse(page([pastEvaluation])),
    ...extra,
  });

describe("One Evaluación nutricional screen", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("leaves Perfil with one evaluation row", async () => {
    const screen = await openProfileRow(fetcherWith([]), "Evaluación nutricional");

    expect(await screen.findByText("Reserva tu evaluación")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Evaluación nutricional" })).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Mis evaluaciones" })).toBeNull();
  });

  // It absorbed Mis evaluaciones, a browsing screen (follow-up 254 § 3): the
  // bar stays, and hides only inside Confirma tu cita.
  it("keeps the tab bar here and hides it on Confirma tu cita", async () => {
    const screen = await openProfileRow(fetcherWith([]), "Evaluación nutricional");

    expect(await screen.findByText("Reserva tu evaluación")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Reservar, tab/ })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Turno 09:00" }));
    expect(await screen.findByText("Confirma tu cita")).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^Reservar, tab/ })).toBeNull();
    });
  });

  it("shows the slots and the past Evaluations when nothing is booked", async () => {
    const screen = await openProfileRow(fetcherWith([]), "Evaluación nutricional");

    expect(await screen.findByText("Reserva tu evaluación")).toBeOnTheScreen();
    expect(screen.queryByText("Tu próxima evaluación")).toBeNull();
    expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    expect(await screen.findByText("Anteriores")).toBeOnTheScreen();
  });

  it("puts an included Evaluation on top with Cancelar evaluación", async () => {
    let cancelled = false;
    const included = upcomingEvaluation("evaluation-free", nextStart);
    const screen = await openProfileRow(
      routeFetcher({
        ...baseRoutes(),
        "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page(cancelled ? [] : [included])),
        "DELETE /api/v1/evaluations/evaluation-free": () => {
          cancelled = true;
          return new Response(null, { status: 204 });
        },
      }),
      "Evaluación nutricional",
    );

    const card = await screen.findByTestId("next-evaluation");
    expect(within(card).getByText("Gratis con tu plan")).toBeOnTheScreen();
    expect(within(card).getByText("09:00")).toBeOnTheScreen();
    expect(screen.getByText("Puedes cancelarla hasta 3 horas antes.")).toBeOnTheScreen();
    expect(screen.getByText("Reserva otra evaluación")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar evaluación" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, cancelar evaluación" }));

    await waitFor(() => expect(screen.queryByTestId("next-evaluation")).toBeNull());
    expect(screen.getByText("Reserva tu evaluación")).toBeOnTheScreen();
  });

  it("reads Pago en revisión and still offers Reprogramar", async () => {
    const screen = await openProfileRow(
      fetcherWith([paid({ paymentState: "pending" })]),
      "Evaluación nutricional",
    );

    const card = await screen.findByTestId("next-evaluation");
    expect(within(card).getByText("Pago en revisión")).toBeOnTheScreen();
    expect(
      screen.getByText("El estudio revisa tu comprobante de Bs 70 y te avisa por la app."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar evaluación" })).toBeNull();
  });

  it("moves a paid Evaluation on the same screen and stays there", async () => {
    let posted = false;
    const moved = paid({ startsAt: boliviaInstant(secondDay, "15:00").toISOString() });
    const screen = await openProfileRow(
      fetcherWith([], {
        "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([posted ? moved : paid()])),
        "POST /api/v1/evaluations/evaluation-paid/reschedule": (init) => {
          posted = true;
          expect(JSON.parse(String(init?.body))).toEqual({ slotId: "slot-3" });
          return jsonResponse(moved);
        },
      }),
      "Evaluación nutricional",
    );

    const card = await screen.findByTestId("next-evaluation");
    expect(within(card).getByText("Pagada")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));

    expect(await screen.findByText("Elige el nuevo horario")).toBeOnTheScreen();
    expect(screen.getByText(/^Cambias tu cita del /)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: dayName(secondDay) }));
    await fireEvent.press(screen.getByRole("button", { name: "Turno 15:00" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, mover evaluación" }));

    expect(await screen.findByText("Evaluación reprogramada")).toBeOnTheScreen();
    await waitFor(() => expect(within(card).getByText("15:00")).toBeOnTheScreen());
    expect(screen.queryByText("Elige el nuevo horario")).toBeNull();
  });

  it("leaves the reschedule with Volver", async () => {
    const screen = await openProfileRow(fetcherWith([paid()]), "Evaluación nutricional");

    await fireEvent.press(await screen.findByRole("button", { name: "Reprogramar" }));
    expect(await screen.findByText("Elige el nuevo horario")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Volver a tu cita" }));

    expect(await screen.findByText("Reserva otra evaluación")).toBeOnTheScreen();
  });

  it("asks her to choose another slot once the studio released hers", async () => {
    const screen = await openProfileRow(
      fetcherWith([paid({ slotReleased: true, reschedulable: false })]),
      "Evaluación nutricional",
    );

    const card = await screen.findByTestId("next-evaluation");
    expect(within(card).getByText("El estudio liberó tu turno")).toBeOnTheScreen();
    expect(
      screen.getByText("Tu pago de Bs 70 sigue vigente: elige otro turno y no pagas de nuevo."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Elegir turno" }));
    expect(await screen.findByText("Elige el nuevo horario")).toBeOnTheScreen();
  });
});
