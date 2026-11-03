import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, createMemoryPushPlatform } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  availability,
  baseRoutes,
  boliviaInstant,
  day,
  dayName,
  firstDay,
  fullDay,
  hour,
  monthOfToday,
  openProfileRow,
  page,
  secondDay,
  slot,
  spanishMonth,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

describe("Client Evaluations", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lists only days with open slots and books one through the confirmation screen", async () => {
    let booked = false;
    const bookedStart = boliviaInstant(firstDay, "09:45");
    const fetcher = routeFetcher(
      baseRoutes({
        "POST /api/v1/evaluation-slots/slot-2/evaluations": () => {
          booked = true;
          return jsonResponse(upcomingEvaluation("evaluation-new", bookedStart), 201);
        },
        "/api/v1/evaluations?scope=upcoming": () =>
          jsonResponse(page(booked ? [upcomingEvaluation("evaluation-new", bookedStart)] : [])),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    await waitFor(() => {
      // C13: one line of copy, then the Nutritionist with the Branch.
      expect(screen.getByText("Una evaluación gratis por mes con tu plan.")).toBeOnTheScreen();
    });
    expect(screen.getByText("Gabriela Rojas")).toBeOnTheScreen();
    expect(screen.getByText("Nutricionista · 45 min · Centro")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: dayName(firstDay) })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: dayName(secondDay) })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: dayName(fullDay) })).toBeNull();
    expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    expect(screen.getByText("Puedes reservar hasta 3 horas antes.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Turno 09:45" }));
    await waitFor(() => {
      expect(screen.getByText("Confirma tu cita")).toBeOnTheScreen();
    });
    // C14: the appointment on the hero card, its terms as icon rows.
    expect(screen.getByTestId("evaluation-hero")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(screen.getByText("45 minutos · Gabriela Rojas · Centro")).toBeOnTheScreen();
    expect(screen.getByText("Es gratis: no usa clases de tu plan")).toBeOnTheScreen();
    expect(screen.getByText("Te avisamos un día y una hora antes")).toBeOnTheScreen();
    expect(screen.getByText("Cancela hasta 3 horas antes")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar evaluación" }));

    await waitFor(() => {
      expect(screen.getByText("Evaluación confirmada")).toBeOnTheScreen();
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/evaluation-slots/slot-2/evaluations",
      expect.objectContaining({
        headers: expect.objectContaining({ "idempotency-key": expect.any(String) }),
        method: "POST",
      }),
    );
    expect(screen.getByText("Mis evaluaciones")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancelar evaluación" })).toBeOnTheScreen();
  });

  it("offers Reprogramar on a confirmed paid evaluation", async () => {
    const paid = upcomingEvaluation("evaluation-paid", boliviaInstant(firstDay, "09:45"), {
      included: false,
      priceCentavos: 7_000,
      paymentId: "payment-1",
      cancellable: false,
      reschedulable: true,
    });
    const screen = await openProfileRow(
      routeFetcher({
        ...baseRoutes(),
        "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([paid])),
      }),
      "Mis evaluaciones",
    );

    expect(await screen.findByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar evaluación" })).toBeNull();
  });

  it("shows an 8-class Client the settings price and starts the QR payment", async () => {
    const paid = {
      included: false,
      priceCentavos: 7_000,
    };
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () =>
          jsonResponse({
            ...availability,
            days: availability.days.map((day) => ({
              ...day,
              slots: day.slots.map((entry) => ({ ...entry, ...paid })),
            })),
          }),
        "POST /api/v1/evaluation-slots/slot-2/evaluation-payments": () =>
          jsonResponse(
            upcomingEvaluation("evaluation-paid", boliviaInstant(firstDay, "09:45"), {
              ...paid,
              paymentId: "payment-1",
            }),
            201,
          ),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));
    expect(
      await screen.findByText("Cuesta Bs 70: transfiere y sube tu comprobante"),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Sube tu comprobante de transferencia" }),
    ).toBeOnTheScreen();
    // The photograph step needs the device camera. Until a receipt is
    // attached the confirm stays disabled, so the payment is not started.
    expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeDisabled();
    expect(fetcher).not.toHaveBeenCalledWith(
      "/api/v1/evaluation-slots/slot-2/evaluation-payments",
      expect.anything(),
    );
  });

  it("offers notifications once the Evaluation is confirmed", async () => {
    const { platform } = createMemoryPushPlatform("undetermined");
    const bookedStart = boliviaInstant(firstDay, "09:45");
    const fetcher = routeFetcher(
      baseRoutes({
        "POST /api/v1/evaluation-slots/slot-2/evaluations": () =>
          jsonResponse(upcomingEvaluation("evaluation-new", bookedStart), 201),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional", {
      pushPlatform: platform,
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Confirmar evaluación" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Activar notificaciones" })).toBeOnTheScreen();
    });
  });

  it("names the Branch on each day when open slots span several Branches", async () => {
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () =>
          jsonResponse({
            ...availability,
            days: [
              {
                date: firstDay,
                slots: [
                  slot("slot-1", firstDay, "09:00"),
                  slot("slot-2", firstDay, "16:00", {
                    branchId: "branch-urubo",
                    branchName: "Urubó",
                  }),
                ],
              },
            ],
          }),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Turno 09:00 · Centro" })).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Turno 16:00 · Urubó" })).toBeOnTheScreen();
  });

  it("shows the calm used-month state naming the next unused month", async () => {
    const used = boliviaInstant(firstDay, "09:00");
    const thisMonth = monthOfToday(0);
    const nextMonth = monthOfToday(1);
    const nextMonthName = spanishMonth(nextMonth);
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () =>
          jsonResponse({
            days: [
              {
                date: firstDay,
                slots: [slot("slot-1", firstDay, "10:00", { bookable: false })],
              },
            ],
            months: [
              {
                month: thisMonth,
                status: "used",
                evaluation: { id: "evaluation-1", startsAt: used.toISOString() },
              },
              { month: nextMonth, status: "available", evaluation: null },
            ],
          }),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    await waitFor(() => {
      expect(screen.getByText("Ya usaste tu evaluación de este mes.")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(`Podrás agendar la de ${nextMonthName} desde el 1 de ${nextMonthName}.`),
    ).toBeOnTheScreen();
    expect(screen.getByText("Tu última evaluación")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Turno/ })).toBeNull();
  });

  it("asks for an active plan before showing any slot", async () => {
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/clients/current/subscription": () =>
          jsonResponse({ status: "none", subscription: null }),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    await waitFor(() => {
      // C13b: the centred v2 state block.
      expect(screen.getByRole("header", { name: "Necesitas un plan activo" })).toBeOnTheScreen();
    });
    expect(screen.getByText("La evaluación es gratuita con cualquier plan.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ver planes" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Turno/ })).toBeNull();
  });

  it("explains a rejected booking on the confirmation screen", async () => {
    const fetcher = routeFetcher(
      baseRoutes({
        "POST /api/v1/evaluation-slots/slot-1/evaluations": () =>
          jsonResponse({ code: "evaluation_month_used", status: 409 }, 409),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Turno 09:00" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar evaluación" }));

    await waitFor(() => {
      expect(
        screen.getByText("Ya tienes una evaluación reservada para ese mes."),
      ).toBeOnTheScreen();
    });
  });

  it("lists upcoming and past Evaluations and cancels one after confirming", async () => {
    let cancelled = false;
    const soon = new Date(Date.now() + 2 * hour);
    const later = new Date(Date.now() + 10 * day);
    const past = new Date(Date.now() - 20 * day);
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluations?scope=upcoming": () =>
          jsonResponse(
            page([
              upcomingEvaluation("evaluation-soon", soon),
              ...(cancelled ? [] : [upcomingEvaluation("evaluation-later", later)]),
            ]),
          ),
        "/api/v1/evaluations?scope=past": () =>
          jsonResponse(page([upcomingEvaluation("evaluation-past", past)])),
        "DELETE /api/v1/evaluations/evaluation-later": () => {
          cancelled = true;
          return new Response(null, { status: 204 });
        },
      }),
    );
    const screen = await openProfileRow(fetcher, "Mis evaluaciones");

    await waitFor(() => {
      // C15: the limit is on each card's line, the action a text button.
      expect(screen.getByText(/ · ya no se puede cancelar$/)).toBeOnTheScreen();
    });
    expect(screen.getByText(/ · cancela hasta 3 h antes$/)).toBeOnTheScreen();
    expect(await screen.findByText("Anteriores")).toBeOnTheScreen();
    expect(screen.getByText("Incluida")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar evaluación" }));
    const sheet = within(screen.getByTestId("cancel-evaluation-sheet"));
    expect(sheet.getByText("¿Cancelar esta evaluación?")).toBeOnTheScreen();
    expect(
      sheet.getByText("El horario queda libre y otras clientas podrán reservarlo."),
    ).toBeOnTheScreen();
    expect(sheet.getByText("Podrás reservar otra evaluación para este mes.")).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Sí, cancelar evaluación" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Cancelar evaluación" })).toBeNull();
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/evaluations/evaluation-later",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("offers booking from the empty list", async () => {
    const fetcher = routeFetcher(baseRoutes());
    const screen = await openProfileRow(fetcher, "Mis evaluaciones");

    await waitFor(() => {
      expect(screen.getByText("No tienes evaluaciones próximas")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Tu evaluación de este mes sigue disponible y es gratis."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Reservar evaluación" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    });
  });
});
