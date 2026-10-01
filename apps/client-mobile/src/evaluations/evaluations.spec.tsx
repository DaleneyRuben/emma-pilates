import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

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
  afterEach(() => {
    cleanup();
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
          jsonResponse(
            page(booked ? [upcomingEvaluation("evaluation-new", bookedStart)] : []),
          ),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    await waitFor(() => {
      expect(
        screen.getByText(
          "Reserva tu evaluación gratuita con la nutricionista. Tienes una evaluación disponible por mes.",
        ),
      ).toBeOnTheScreen();
    });
    expect(screen.getByText("Gabriela Rojas")).toBeOnTheScreen();
    expect(screen.getByText("Nutricionista · sesiones de 45 min")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: dayName(firstDay) })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: dayName(secondDay) })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: dayName(fullDay) })).toBeNull();
    expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    expect(screen.getByText("Puedes reservar hasta 3 horas antes.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Turno 09:45" }));
    await waitFor(() => {
      expect(screen.getByText("Confirmar evaluación")).toBeOnTheScreen();
    });
    expect(screen.getByText("45 minutos · Sucursal Centro")).toBeOnTheScreen();
    expect(screen.getByText("Es gratuita — no usa clases de tu plan.")).toBeOnTheScreen();
    expect(
      screen.getByText("Te avisaremos un día antes y una hora antes de tu cita."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));

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
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
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
      screen.getByText(
        `Podrás agendar la de ${nextMonthName} desde el 1 de ${nextMonthName}.`,
      ),
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
      expect(
        screen.getByText("Necesitas un plan activo para reservar tu evaluación."),
      ).toBeOnTheScreen();
    });
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
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));

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
      expect(screen.getByText("Ya no se puede cancelar")).toBeOnTheScreen();
    });
    expect(screen.getByText("Puedes cancelar hasta 3 horas antes.")).toBeOnTheScreen();
    expect(await screen.findByText("Anteriores")).toBeOnTheScreen();
    expect(screen.getByText("Realizada")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    const sheet = within(screen.getByTestId("cancel-evaluation-sheet"));
    expect(sheet.getByText("¿Cancelar esta evaluación?")).toBeOnTheScreen();
    expect(
      sheet.getByText("El horario queda libre y otras clientas podrán reservarlo."),
    ).toBeOnTheScreen();
    expect(
      sheet.getByText("Podrás reservar otra evaluación para este mes."),
    ).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Sí, cancelar evaluación" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
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
      expect(screen.getByText("No tienes evaluaciones próximas.")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reservar evaluación" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    });
  });
});
