import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  entry,
  inDays,
  openApp,
  openAvailability,
  page,
  pickTime,
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

async function openForm() {
  const screen = await openAvailability(routeFetcher(routes()));
  await fireEvent.press(screen.getAllByRole("button", { name: "Nuevo horario" })[0]!);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Martes" })).toBeOnTheScreen();
  });
  return screen;
}

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
    await pickTime(screen, "10:00");
    await fireEvent.press(screen.getByRole("button", { name: "Hora de fin: Elegir" }));
    await pickTime(screen, "10:45");

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

    expect(await screen.findByLabelText(`${started.time} Valeria Áñez`)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar evaluación" })).not.toBeOnTheScreen();
  });

  // Follow-up 225 §7: the toast never fades on its own; its × closes it.
  it("keeps the «Evaluación cancelada» toast until its × closes it", async () => {
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

    await fireEvent.press(await screen.findByTestId("cancel-evaluation-evaluation-1"));
    const sheet = within(screen.getByTestId("cancel-evaluation-sheet"));
    await fireEvent.press(sheet.getByRole("button", { name: "Sí, cancelar evaluación" }));
    expect(await screen.findByText("Evaluación cancelada")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar aviso" }));
    await waitFor(() => expect(screen.queryByText("Evaluación cancelada")).not.toBeOnTheScreen());
  });

  it("opens S17b's wheel on 9:00 and confirms a start with Listo (follow-up 262)", async () => {
    const screen = await openForm();
    await fireEvent.press(screen.getByRole("button", { name: "Hora de inicio: Elegir" }));

    const sheet = within(screen.getByTestId("time-wheel-sheet"));
    expect(sheet.getByText("9:00")).toBeOnTheScreen();
    expect(sheet.getByText("Cada 15 minutos, de 6:00 a 22:00")).toBeOnTheScreen();
    expect(sheet.getByRole("button", { name: "Hora 9" })).toBeSelected();
    expect(sheet.getByRole("button", { name: "Minuto 00" })).toBeSelected();
    expect(sheet.queryByRole("button", { name: "Hora 22" })).toBeNull();
    await fireEvent.press(sheet.getByRole("button", { name: "Hora 14" }));
    await fireEvent.press(sheet.getByRole("button", { name: "Minuto 30" }));
    expect(sheet.getByText("14:30")).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Listo" }));

    expect(screen.getByRole("button", { name: "Hora de inicio: 14:30" })).toBeOnTheScreen();
    expect(screen.queryByTestId("time-wheel-sheet")).toBeNull();
  });

  it("offers only ends at least 45 minutes after the start, with their turnos", async () => {
    const screen = await openForm();
    await fireEvent.press(screen.getByRole("button", { name: "Hora de inicio: Elegir" }));
    await pickTime(screen, "21:00");
    await fireEvent.press(screen.getByRole("button", { name: "Hora de fin: Elegir" }));

    const sheet = within(screen.getByTestId("time-wheel-sheet"));
    expect(sheet.getByText("22:00")).toBeOnTheScreen();
    expect(sheet.getByText("1 h · 1 turno de 45 min")).toBeOnTheScreen();
    expect(sheet.getByRole("button", { name: "Hora 20" })).toBeDisabled();
    expect(sheet.getByRole("button", { name: "Minuto 15" })).toBeDisabled();
    await fireEvent.press(sheet.getByRole("button", { name: "Hora 20" }));
    expect(sheet.getByText("22:00")).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Hora 21" }));
    expect(sheet.getByText("21:45")).toBeOnTheScreen();
    expect(sheet.getByText("45 min · 1 turno de 45 min")).toBeOnTheScreen();
    expect(sheet.getByRole("button", { name: "Minuto 30" })).toBeDisabled();
    await fireEvent.press(sheet.getByRole("button", { name: "Volver" }));

    expect(screen.getByRole("button", { name: "Hora de fin: Elegir" })).toBeOnTheScreen();
  });

  it("sends the end back to Elegir when a later start leaves it under 45 minutes", async () => {
    const screen = await openForm();
    await fireEvent.press(screen.getByRole("button", { name: "Hora de inicio: Elegir" }));
    await pickTime(screen, "10:00");
    await fireEvent.press(screen.getByRole("button", { name: "Hora de fin: Elegir" }));
    await pickTime(screen, "11:30");
    expect(screen.getByText("2 turnos de 45 min")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Hora de inicio: 10:00" }));
    expect(
      within(screen.getByTestId("time-wheel-sheet")).getByRole("button", { name: "Hora 10" }),
    ).toBeSelected();
    await pickTime(screen, "11:00");

    expect(screen.getByRole("button", { name: "Hora de fin: Elegir" })).toBeOnTheScreen();
  });
});
