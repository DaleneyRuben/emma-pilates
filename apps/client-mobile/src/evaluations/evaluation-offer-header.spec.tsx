import { cleanup } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  availability,
  baseRoutes,
  openProfileRow,
  slot,
  firstDay,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

// Walkthrough finding 69 (FIX-056): the header says what her Plan gives.
// Only a Plan of 90 days or longer includes its first Evaluation.
const offered = (includedEvaluation: "available" | "used" | "none") =>
  routeFetcher(
    baseRoutes({
      "/api/v1/evaluation-slots": () =>
        jsonResponse({
          ...availability,
          days: [
            {
              date: firstDay,
              slots: [
                slot("slot-1", firstDay, "09:00", {
                  included: includedEvaluation === "available",
                  priceCentavos: includedEvaluation === "available" ? 0 : 7_000,
                }),
              ],
            },
          ],
          includedEvaluation,
          priceCentavos: 7_000,
        }),
    }),
  );

describe("The Evaluación nutricional header", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("gives the price when her Plan includes no Evaluation", async () => {
    const screen = await openProfileRow(offered("none"), "Evaluación nutricional");

    expect(await screen.findByText("Cuesta Bs 70 con tu plan.")).toBeOnTheScreen();
    expect(screen.queryByText(/gratis/)).toBeNull();
  });

  it("says the quarter's first Evaluation is free", async () => {
    const screen = await openProfileRow(offered("available"), "Evaluación nutricional");

    expect(
      await screen.findByText("Tu primera evaluación del trimestre es gratis."),
    ).toBeOnTheScreen();
  });

  it("says the free one of the quarter is used and gives the price", async () => {
    const screen = await openProfileRow(offered("used"), "Evaluación nutricional");

    expect(
      await screen.findByText("Ya usaste la gratis de este trimestre · Bs 70."),
    ).toBeOnTheScreen();
  });

  it("gives the same line on an empty Mis evaluaciones", async () => {
    const screen = await openProfileRow(offered("none"), "Mis evaluaciones");

    expect(await screen.findByText("No tienes evaluaciones próximas")).toBeOnTheScreen();
    expect(await screen.findByText("Cuesta Bs 70 con tu plan.")).toBeOnTheScreen();
    expect(screen.queryByText(/gratis/)).toBeNull();
  });
});
