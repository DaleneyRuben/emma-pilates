import { cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions, StyleSheet } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { assistantRoutes, openClientSearch, openLucia, overview } from "./assistant-fixtures";

jest.setTimeout(20_000);

const withoutPlan = () => ({
  ...assistantRoutes(),
  "/api/v1/assistant/clients/client-lucia": () =>
    jsonResponse({ ...overview, subscription: { status: "none", subscription: null } }),
});

// MOB-038: the screens moved onto Superficie, so S06's surfaces follow the frames.
describe("Assistant surfaces on Superficie", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("draws S06's «Sin plan activo» as the frames' dashed neutral box", async () => {
    const screen = await openLucia(withoutPlan());

    expect(screen.getByText("Sin plan activo").parent).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.14)",
      borderColor: "#D8C9BB",
      borderStyle: "dashed",
      borderWidth: 1,
    });
  });

  it("leaves the tablet's empty panel unfilled, as the split-view frames do", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width: 1024, height: 1366, scale: 2, fontScale: 1 });
    const screen = await openClientSearch(assistantRoutes());

    const panel = screen.getByText("Selecciona un cliente para ver sus detalles").parent;
    expect(StyleSheet.flatten(panel?.props.style)).not.toHaveProperty("backgroundColor");
  });

  it("rings the unread dot in the header's Superficie", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            ...assistantRoutes(),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 2 }),
          }),
          "assistant",
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("account-avatar-dot")).toHaveStyle({ borderColor: "#FAF7F2" });
    });
  });
});

const hidden = { includeHiddenElements: true };

// MOB-039: the cards take the frames' border and radius, and the two empty
// states their icon, Lora title, and copy.
describe("Assistant cards and empty states (MOB-039)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("draws S06's cards on Blanco with a 1 pt Borde fuerte and radius 16", async () => {
    const screen = await openLucia(assistantRoutes());

    expect(screen.getByText("Historial").parent?.parent).toHaveStyle({
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderWidth: 1,
    });
  });

  it("centres S06's «Sin plan activo» with the card icon and the frame's copy", async () => {
    const screen = await openLucia(withoutPlan());

    expect(screen.getByTestId("empty-state-icon-card", hidden)).toBeOnTheScreen();
    expect(screen.getByText("Sin plan activo")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 19,
      textAlign: "center",
    });
    expect(
      screen.getByText(
        "Esta clienta no tiene clases disponibles. Registra un pago para activar un plan y poder reservar.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText("Registra un pago en efectivo para activar un plan."),
    ).not.toBeOnTheScreen();
  });

  it("draws the tablet's empty panel with the person circle, a Lora 22 title, and its helper", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width: 1024, height: 1366, scale: 2, fontScale: 1 });
    const screen = await openClientSearch(assistantRoutes());

    expect(screen.getByTestId("empty-state-circle")).toHaveStyle({ height: 64, width: 64 });
    expect(screen.getByTestId("empty-state-icon-person", hidden)).toBeOnTheScreen();
    expect(screen.getByText("Selecciona un cliente para ver sus detalles")).toHaveStyle({
      fontFamily: "Lora_400Regular",
      fontSize: 22,
    });
    expect(
      screen.getByText(
        "Busca por nombre, teléfono o correo en el panel izquierdo. Su ficha se abrirá aquí, sin perder la lista.",
      ),
    ).toBeOnTheScreen();
  });
});
