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

  // Follow-up 225 §6: the in-list state block stands on Lino, not the dashed box.
  it("draws S06's «Sin plan activo» as the v2 state block on Lino", async () => {
    const screen = await openLucia(withoutPlan());

    expect(screen.getByTestId("client-no-plan")).toHaveStyle({
      backgroundColor: "#F5EFE9",
      borderRadius: 16,
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

  it("puts the unread count on the bell beside Buscar cliente", async () => {
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
      expect(screen.getByRole("button", { name: "Notificaciones, 2 sin leer" })).toBeOnTheScreen();
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

  it("groups S06's Bookings and history as rows on Lino", async () => {
    const screen = await openLucia(assistantRoutes());

    expect(screen.getByText("Historial de clases")).toBeOnTheScreen();
    expect(screen.getByTestId("client-overview-history").parent).toHaveStyle({
      backgroundColor: "#F5EFE9",
      borderRadius: 16,
    });
  });

  it("offers S06's cash sale from «Sin plan activo» with the board's copy", async () => {
    const screen = await openLucia(withoutPlan());

    expect(
      screen.getByText("Registra un pago para activar un plan y poder reservarle clases."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reservar clase" })).toBeNull();
  });

  it("draws the tablet's empty panel with the person disc, a Lora 24 title, and its helper", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width: 1024, height: 1366, scale: 2, fontScale: 1 });
    const screen = await openClientSearch(assistantRoutes());

    expect(screen.getByTestId("empty-state-disc")).toHaveStyle({ height: 72, width: 72 });
    expect(screen.getByTestId("empty-state-icon-person", hidden)).toBeOnTheScreen();
    expect(screen.getByText("Selecciona un cliente para ver sus detalles")).toHaveStyle({
      fontFamily: "Lora_400Regular",
      fontSize: 24,
    });
    expect(
      screen.getByText(
        "Busca por nombre, teléfono o correo en el panel izquierdo. Su ficha se abrirá aquí, sin perder la lista.",
      ),
    ).toBeOnTheScreen();
  });
});
