import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  baseRoutes,
  boliviaInstant,
  monthOfToday,
  openProfileRow,
  page,
  spanishMonth,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

// Decided for MOB-022: name the month wherever it can differ from today's.
describe("Evaluation month copy (13, 14, 15)", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("names the used month on 13 when it is a later one", async () => {
    const nextMonth = monthOfToday(1);
    const used = boliviaInstant(nextMonth, "09:00");
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () =>
          jsonResponse({
            days: [],
            months: [
              { month: monthOfToday(0), status: "available", evaluation: null },
              {
                month: nextMonth,
                status: "used",
                evaluation: { id: "evaluation-1", startsAt: used.toISOString() },
              },
            ],
          }),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    expect(
      await screen.findByText(`Ya usaste tu evaluación de ${spanishMonth(nextMonth)}.`),
    ).toBeOnTheScreen();
  });

  it("says where to cancel on 14", async () => {
    const screen = await openProfileRow(routeFetcher(baseRoutes()), "Evaluación nutricional");
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:00" }));

    expect(
      await screen.findByText(
        "Si necesitas cambiarla, puedes cancelarla desde Mis evaluaciones hasta 3 horas antes.",
      ),
    ).toBeOnTheScreen();
  });

  it("does not call this month's Evaluation available on 15 once it took place", async () => {
    // Early on the 1st, «two hours ago» is still last month.
    const earlier = boliviaInstant(monthOfToday(0), "00:01");
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluations?scope=past": () =>
          jsonResponse(page([upcomingEvaluation("evaluation-past", earlier)])),
      }),
    );
    const screen = await openProfileRow(fetcher, "Mis evaluaciones");

    expect(
      await screen.findByText(
        `Ya usaste tu evaluación de este mes. Puedes reservar la de ${spanishMonth(monthOfToday(1))}, también gratuita.`,
      ),
    ).toBeOnTheScreen();
  });

  it("names the freed month when the cancelled Evaluation is next month's", async () => {
    const nextMonth = monthOfToday(1);
    const startsAt = boliviaInstant(nextMonth, "10:00");
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluations?scope=upcoming": () =>
          jsonResponse(page([upcomingEvaluation("evaluation-next", startsAt)])),
      }),
    );
    const screen = await openProfileRow(fetcher, "Mis evaluaciones");

    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar" }));
    const sheet = within(screen.getByTestId("cancel-evaluation-sheet"));

    expect(
      sheet.getByText(`Podrás reservar otra evaluación para ${spanishMonth(nextMonth)}.`),
    ).toBeOnTheScreen();
  });
});
