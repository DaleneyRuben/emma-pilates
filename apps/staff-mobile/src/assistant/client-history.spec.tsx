import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, textVariants } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia } from "./assistant-fixtures";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

async function openHistory(routes: ReturnType<typeof assistantRoutes>) {
  const screen = await openLucia(routes);
  await fireEvent.press(screen.getByTestId("client-overview-history"));
  await waitFor(() => {
    expect(screen.getByRole("tab", { name: "Historial" })).toHaveProp("accessibilityState", {
      selected: true,
    });
  });
  return screen;
}

// MOB-040: S22 draws the same rows between rules as 07, headed by «Ha
// asistido a», with the frame's bare empty state.
describe("Assistant Client history (S22)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws each class as a ruled row under the summary and the month counts", async () => {
    const screen = await openHistory(assistantRoutes());

    await waitFor(() => {
      expect(screen.getByText("Asistió a")).toBeOnTheScreen();
    });
    // Rosa Emma C05d: the summary is the 600 hero, each month a white card
    // under its 50 header strip. Follow-up 285 (board E-R10): the count is a
    // titulo-bloque, Lora 22.
    expect(screen.getByText("3 clases desde agosto")).toHaveStyle(textVariants["titulo-bloque"]);
    expect(screen.getByTestId("class-history-summary")).toHaveStyle({
      backgroundColor: "#93615D",
    });
    expect(screen.getByText("Septiembre 2026").parent).toHaveStyle({
      backgroundColor: "#FEF6F2",
    });
    expect(screen.getByText("2 clases")).toBeOnTheScreen();
    expect(screen.getByText("1 clase")).toBeOnTheScreen();
    expect(screen.getByText("15")).toHaveStyle(textVariants.cifra);
    // 15 and 8 September are both Tuesdays.
    expect(screen.getAllByText("mar")).toHaveLength(2);

    const rows = screen.getAllByTestId("class-history-row");
    expect(rows).toHaveLength(3);
    expect(StyleSheet.flatten(rows[0].props.style)).not.toHaveProperty("backgroundColor");
    expect(StyleSheet.flatten(rows[0].props.style)).toMatchObject({
      borderBottomColor: "#F9E7DF",
      borderBottomWidth: 1,
    });
    expect(StyleSheet.flatten(rows[2].props.style)).not.toHaveProperty("borderBottomWidth");
  });

  it("centres the empty state's titulo-fila title with the Rosa profundo clock", async () => {
    const screen = await openHistory({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia/class-history": () => jsonResponse([]),
    });

    await waitFor(() => {
      expect(screen.getByText("Todavía no tomó clases")).toHaveStyle({
        ...textVariants["titulo-fila"],
        textAlign: "center",
      });
    });
    expect(screen.getByTestId("empty-state-icon-clock", hidden)).toHaveProp("stroke", "#93615D");
  });
});
