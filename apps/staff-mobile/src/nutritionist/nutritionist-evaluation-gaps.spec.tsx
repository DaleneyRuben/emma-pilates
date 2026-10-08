import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  entry,
  inDays,
  openApp,
  openAvailability,
  page,
  routes,
} from "./nutritionist-test-support";

jest.setTimeout(30_000);

// A slot that started a quarter of an hour ago, in Bolivia time.
const startedAgo = () => {
  const started = new Date(Date.now() - 15 * 60_000);
  const time = new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  }).format(started);
  return { date: boliviaCivilDate(started), time };
};

describe("Nutritionist Evaluation gaps (S15, S17)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("previews a single slot in the singular", async () => {
    const screen = await openAvailability(routeFetcher(routes()));
    await fireEvent.press(screen.getAllByRole("button", { name: "Nuevo horario" })[0]!);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Martes" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Hora de inicio: Elegir" }));
    await fireEvent.press(screen.getByRole("button", { name: "10:00" }));
    await fireEvent.press(screen.getByRole("button", { name: "Hora de fin: Elegir" }));
    await fireEvent.press(screen.getByRole("button", { name: "10:45" }));

    expect(screen.getByText("1 turno de 45 min")).toBeOnTheScreen();
  });

  it("offers no cancellation once the Evaluation has started", async () => {
    const started = startedAgo();
    const screen = await openApp(
      routeFetcher(
        routes({
          "/api/v1/nutritionist/evaluations": () =>
            jsonResponse(
              page([entry("evaluation-1", started.date, started.time, "Valeria Áñez", "first")]),
            ),
        }),
      ),
    );

    await fireEvent.press(
      await screen.findByRole("button", { name: `${started.time} Valeria Áñez` }),
    );

    expect(screen.queryByRole("button", { name: "Cancelar evaluación" })).not.toBeOnTheScreen();
  });

  it("lets the «Evaluación cancelada» strip fade after 8 seconds", async () => {
    const screen = await openApp(
      routeFetcher(
        routes({
          "/api/v1/nutritionist/evaluations": () =>
            jsonResponse(
              page([entry("evaluation-1", inDays(1), "09:45", "Lucía Justiniano", "first")]),
            ),
          "DELETE /api/v1/nutritionist/evaluations/evaluation-1": () =>
            new Response(null, { status: 204 }),
        }),
      ),
    );

    await fireEvent.press(await screen.findByRole("button", { name: "09:45 Lucía Justiniano" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar evaluación" }));
    const sheet = within(screen.getByTestId("cancel-evaluation-sheet"));
    await fireEvent.press(sheet.getByRole("button", { name: "Sí, cancelar evaluación" }));
    expect(await screen.findByText("Evaluación cancelada")).toBeOnTheScreen();

    await waitFor(() => expect(screen.queryByText("Evaluación cancelada")).not.toBeOnTheScreen(), {
      timeout: 10_000,
    });
  });

  it("marks the field's current time in the S17 time sheet (follow-up 74)", async () => {
    const screen = await openAvailability(routeFetcher(routes()));
    await fireEvent.press(screen.getAllByRole("button", { name: "Nuevo horario" })[0]!);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Martes" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Hora de inicio: Elegir" }));
    await fireEvent.press(screen.getByRole("button", { name: "10:00" }));
    await fireEvent.press(screen.getByRole("button", { name: /^Hora de inicio: 10:00/ }));

    expect(screen.getByRole("button", { name: "10:00" })).toBeSelected();
    expect(screen.getByRole("button", { name: "10:15" })).not.toBeSelected();
    expect(within(screen.getByRole("button", { name: "10:00" })).getByText("10:00")).toHaveStyle({
      color: "#8A5D59",
    });
    expect(
      screen.getByTestId("picker-check-10:00", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });
});
