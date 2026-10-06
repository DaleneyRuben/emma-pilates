import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia } from "./assistant-fixtures";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

async function openHistory(routes: ReturnType<typeof assistantRoutes>) {
  const screen = await openLucia(routes);
  await fireEvent.press(screen.getByRole("button", { name: "Ver historial completo" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Historial de clases")).toBeOnTheScreen();
  });
  return screen;
}

// MOB-040: S22 draws the same rows between rules as 07, headed by «Ha
// asistido a», with the frame's bare empty state.
describe("Assistant Client history (S22)", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws each class as a ruled row under the summary and the month counts", async () => {
    const screen = await openHistory(assistantRoutes());

    await waitFor(() => {
      expect(screen.getByText("Ha asistido a")).toBeOnTheScreen();
    });
    expect(screen.getByText("3 clases desde agosto")).toHaveStyle({ fontSize: 26 });
    expect(screen.getByText("Septiembre 2026").parent).toHaveStyle({
      borderBottomColor: "#D8C9BB",
      borderBottomWidth: 1,
    });
    expect(screen.getByText("2 clases")).toBeOnTheScreen();
    expect(screen.getByText("1 clase")).toBeOnTheScreen();
    expect(screen.getByText("15")).toHaveStyle({ fontFamily: "Lora_500Medium", fontSize: 20 });
    expect(screen.getByText("mar")).toBeOnTheScreen();

    const rows = screen.getAllByTestId("class-history-row");
    expect(rows).toHaveLength(3);
    expect(StyleSheet.flatten(rows[0].props.style)).not.toHaveProperty("backgroundColor");
    expect(StyleSheet.flatten(rows[0].props.style)).toMatchObject({
      borderBottomColor: "#EFE7DE",
      borderBottomWidth: 1,
    });
    expect(StyleSheet.flatten(rows[2].props.style)).not.toHaveProperty("borderBottomWidth");
  });

  it("centres the empty state as the frame's bare Lora 21 title with the quiet clock", async () => {
    const screen = await openHistory({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia/class-history": () => jsonResponse([]),
    });

    await waitFor(() => {
      expect(screen.getByText("Esta clienta aún no tiene clases en su historial.")).toHaveStyle({
        fontFamily: "Lora_500Medium",
        fontSize: 21,
        textAlign: "center",
      });
    });
    expect(screen.getByTestId("empty-state-icon-clock", hidden)).toHaveProp("stroke", "#C4BAB6");
  });
});
