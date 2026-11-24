import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import {
  baseRoutes,
  boliviaInstant,
  civilDateIn,
  day,
  page,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

const pastEvaluation = upcomingEvaluation("evaluation-past", new Date(Date.now() - 30 * day), {
  state: "completed",
  cancellable: false,
});
const nextEvaluation = upcomingEvaluation(
  "evaluation-next",
  boliviaInstant(civilDateIn(6), "09:00"),
);

const fetcherWith = (upcoming: unknown[]) =>
  routeFetcher({
    ...baseRoutes(),
    "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page(upcoming)),
    "/api/v1/evaluations?scope=past": () => jsonResponse(page([pastEvaluation])),
  });

// The tablet's tab bar holds tabs, not buttons: open Perfil by its testID.
async function openEvaluations(fetcher: typeof globalThis.fetch) {
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await fireEvent.press(await screen.findByRole("button", { name: "Evaluación nutricional" }));
  return screen;
}

function windowWidth(width: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

// Follow-up 289: 13T, 14T and 15T on a tablet.
describe("Evaluación nutricional on a tablet", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("sets the offer and the Nutritionist in 300 pt beside the turnos (13T)", async () => {
    windowWidth(834);
    const screen = await openEvaluations(fetcherWith([]));

    expect(await screen.findByText("Reserva tu evaluación")).toBeOnTheScreen();
    const left = screen.getByTestId("tablet-columns-left");
    expect(left).toHaveStyle({ width: 300 });
    expect(within(left).getByTestId("evaluation-offer")).toBeOnTheScreen();
    expect(within(left).getByText("Gabriela Rojas")).toBeOnTheScreen();
    const right = screen.getByTestId("tablet-columns-right");
    expect(within(right).getByText("Reserva tu evaluación")).toBeOnTheScreen();
    expect(within(right).getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    expect(within(right).queryByText("Gabriela Rojas")).toBeNull();
    expect(within(right).getByText("Anteriores")).toBeOnTheScreen();
  });

  it("confirms the appointment in a centred 520 pt column (14T)", async () => {
    windowWidth(834);
    const screen = await openEvaluations(fetcherWith([]));

    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:00" }));
    expect(await screen.findByText("Confirma tu cita")).toBeOnTheScreen();
    const columns = screen.getAllByTestId("tablet-column");
    expect(columns).toHaveLength(2);
    for (const column of columns) expect(column).toHaveStyle({ maxWidth: 520 });
    expect(within(columns[0]!).getByTestId("evaluation-hero")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("evaluation-footer")).getByText("Confirmar evaluación"),
    ).toBeOnTheScreen();
  });

  it("puts her appointments beside «Anteriores» in two equal columns (15T)", async () => {
    windowWidth(834);
    const screen = await openEvaluations(fetcherWith([nextEvaluation]));

    await waitFor(() => expect(screen.getByTestId("next-evaluation")).toBeOnTheScreen());
    const left = screen.getByTestId("tablet-columns-left");
    expect(left).toHaveStyle({ flex: 1 });
    expect(within(left).getByTestId("next-evaluation")).toBeOnTheScreen();
    const right = screen.getByTestId("tablet-columns-right");
    expect(await within(right).findByText("Anteriores")).toBeOnTheScreen();
    expect(within(right).queryByTestId("next-evaluation")).toBeNull();
  });

  it("keeps the phone's single stack under 768 pt", async () => {
    windowWidth(390);
    const screen = await openEvaluations(fetcherWith([]));

    expect(await screen.findByText("Reserva tu evaluación")).toBeOnTheScreen();
    expect(screen.queryByTestId("tablet-columns")).toBeNull();
    expect(screen.getByText("Gabriela Rojas")).toBeOnTheScreen();
  });
});
