import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { routeFetcher } from "../test-support";
import {
  openReport,
  postedBody,
  quantityType,
  routes,
  type SessionType,
  unit,
  unitType,
} from "./report-fault-fixtures";

// Achumani in the walkthrough: one Reformer, already out of service.
const achumani = (): SessionType[] => [
  unitType("Reformer", [unit("Reformer", 1, "out_of_service")]),
  quantityType("Balones", 0, 12),
];

const several = (): SessionType[] => [
  unitType("Reformer", [unit("Reformer", 3), unit("Reformer", 5, "out_of_service")]),
  unitType("Mat", [unit("Mat", 1)]),
];

// S26 (FIX-076, follow-up 279): the unit picker says what it is, picks a lone
// unit, and the disabled button says what is missing.
describe("Trainer fault report unit picker", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("titles the tiles «Número del equipo» and labels them «N.º»", async () => {
    const screen = await openReport(routeFetcher(routes(several())));

    await waitFor(() => expect(screen.getByText("Número del equipo")).toBeOnTheScreen());
    expect(screen.getByText("N.º 3")).toBeOnTheScreen();
    expect(screen.getByText("N.º 5")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reformer 3" })).not.toBeSelected();
    expect(screen.queryByText("Es el único de esta sucursal.")).toBeNull();
  });

  it("chooses the only unit of a type and sends it once described", async () => {
    const fetcher = routeFetcher(routes(achumani()));
    const screen = await openReport(fetcher);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reformer 1, fuera de servicio" })).toBeSelected(),
    );
    expect(screen.getByText("Es el único de esta sucursal.")).toBeOnTheScreen();
    expect(screen.getByText("Para enviarlo, cuenta qué pasó.")).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("¿Qué pasó?"), "Se rompió la correa.");
    expect(screen.queryByText("Para enviarlo, cuenta qué pasó.")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Enviar reporte" }));

    await waitFor(() => expect(screen.getByText("Gracias por avisar")).toBeOnTheScreen());
    expect(postedBody(fetcher)).toEqual([
      { equipmentId: "reformer-1", description: "Se rompió la correa.", outOfService: false },
    ]);
  });

  it("chooses the only unit again after switching types", async () => {
    const screen = await openReport(routeFetcher(routes(several())));
    await waitFor(() => expect(screen.getByRole("button", { name: "Mat" })).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole("button", { name: "Mat" }));
    expect(screen.getByRole("button", { name: "Mat 1" })).toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: "Reformer" }));
    expect(screen.getByRole("button", { name: "Reformer 3" })).not.toBeSelected();
  });

  it("says what is missing next to the disabled button", async () => {
    const screen = await openReport(routeFetcher(routes(several())));

    await waitFor(() =>
      expect(
        screen.getByText("Para enviarlo, elige el número y cuenta qué pasó."),
      ).toBeOnTheScreen(),
    );
    await fireEvent.changeText(screen.getByLabelText("¿Qué pasó?"), "Chirría.");
    expect(screen.getByText("Para enviarlo, elige el número del Reformer.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Reformer 3" }));
    expect(screen.queryByText(/^Para enviarlo/)).toBeNull();
    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeEnabled();
  });

  it("says a quantity type with none usable cannot be sent", async () => {
    const screen = await openReport(routeFetcher(routes(achumani())));
    await waitFor(() => expect(screen.getByRole("button", { name: "Balones" })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: "Balones" }));

    expect(screen.getByText("No hay ninguno que se pueda usar.")).toBeOnTheScreen();
  });
});
