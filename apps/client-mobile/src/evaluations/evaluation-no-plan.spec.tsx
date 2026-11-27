import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import {
  availability,
  baseRoutes,
  day,
  openProfileRow,
  page,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

const past = upcomingEvaluation("evaluation-past", new Date(Date.now() - 30 * day), {
  state: "completed",
  cancellable: false,
});

// Owner, 2026-11-27: with no Plan that covers an Evaluation (as the server
// says), C13b comes up front, before any turno, QR or receipt.
const noPlanRoutes = (overrides: Record<string, () => Response | Promise<Response>> = {}) =>
  baseRoutes({
    "/api/v1/evaluation-slots": () =>
      jsonResponse({ ...availability, includedEvaluation: "none", planCoversEvaluation: false }),
    ...overrides,
  });

const expectNoPlanState = (screen: Awaited<ReturnType<typeof render>>) => {
  expect(screen.getByRole("header", { name: "Necesitas un plan activo" })).toBeOnTheScreen();
  expect(
    screen.getByText("Con el plan trimestral, la primera evaluación del trimestre es gratis."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Ver planes" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: /^Turno/ })).toBeNull();
  expect(screen.queryByText("Reserva tu evaluación")).toBeNull();
};

describe("Evaluación nutricional without a Plan that covers one", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("shows C13b when the server says no Plan covers her, whatever her Plan card says", async () => {
    const screen = await openProfileRow(routeFetcher(noPlanRoutes()), "Evaluación nutricional");

    await waitFor(() => expectNoPlanState(screen));
  });

  it("shows C13b even with past Evaluations", async () => {
    const fetcher = routeFetcher(
      noPlanRoutes({
        "/api/v1/clients/current/subscription": () =>
          jsonResponse({ status: "none", subscription: null }),
        "/api/v1/evaluations?scope=past": () => jsonResponse(page([past])),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    await waitFor(() => expectNoPlanState(screen));
  });

  it("shows C13b from Inicio's «Evaluación nutricional»", async () => {
    const fetcher = routeFetcher(
      noPlanRoutes({
        "/api/v1/clients/current/subscription": () =>
          jsonResponse({ status: "none", subscription: null }),
      }),
    );
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
    await fireEvent.press(
      await screen.findByRole("button", { name: /^Evaluación nutricional/ }, { timeout: 10_000 }),
    );

    await waitFor(() => expectNoPlanState(screen));
  });

  it("shows C13b on a tablet", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width: 834 });
    const screen = await render(
      <App runtime={createClientRuntime(routeFetcher(noPlanRoutes()))} />,
    );
    await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
      timeout: 10_000,
    });
    await fireEvent.press(screen.getByTestId("tab-profile"));
    await fireEvent.press(await screen.findByRole("button", { name: "Evaluación nutricional" }));

    await waitFor(() => expectNoPlanState(screen));
  });

  it("offers the turnos when the server says a Plan covers her, even with no current Plan card", async () => {
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/clients/current/subscription": () =>
          jsonResponse({ status: "none", subscription: null }),
        "/api/v1/evaluation-slots": () =>
          jsonResponse({ ...availability, includedEvaluation: "none", planCoversEvaluation: true }),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    expect(await screen.findByRole("button", { name: /^Turno 09:00/ })).toBeOnTheScreen();
    expect(screen.queryByText(/Necesitas un plan activo/)).toBeNull();
  });
});
