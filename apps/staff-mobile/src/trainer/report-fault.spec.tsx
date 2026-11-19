import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { routeFetcher } from "../test-support";
import {
  openReport,
  postedBody,
  quantityType,
  routes,
  unit,
  unitType,
} from "./report-fault-fixtures";

const studio = () => [
  unitType("Reformer", [unit("Reformer", 3), unit("Reformer", 5, "out_of_service")]),
  unitType("Mat", [unit("Mat", 1)]),
  quantityType("Balones", 11),
  unitType("Silla", [unit("Silla", 2)]),
];

// S26 (BKO-004, FIX-067): a Trainer reports a fault from a Session of her agenda.
describe("Trainer fault report", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("offers every type as a chip, the Session's first and chosen", async () => {
    const screen = await openReport(routeFetcher(routes(studio())));

    await waitFor(() => expect(screen.getByRole("button", { name: "Reformer" })).toBeSelected());
    expect(screen.getByText("Equipos de la sucursal Equipetrol")).toBeOnTheScreen();
    for (const name of ["Mat", "Balones", "Silla"])
      expect(screen.getByRole("button", { name })).not.toBeSelected();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("button", { name: "Reformer 3" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Silla 2" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Silla" }));
    expect(screen.getByRole("button", { name: "Silla" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Silla 2" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reformer 3" })).toBeNull();
  });

  it("sends the chosen unit, what happened, and whether it can be used", async () => {
    const fetcher = routeFetcher(routes(studio()));
    const screen = await openReport(fetcher);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reformer 3" })).toBeOnTheScreen(),
    );
    expect(screen.getByRole("button", { name: "Reformer 5, fuera de servicio" })).toBeOnTheScreen();
    // FormB (FIX-089): the example goes under the field, never in it.
    expect(screen.getByText("Ej.: el resorte rojo se soltó")).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText("Ej.: el resorte rojo se soltó")).toBeNull();
    expect(screen.queryByRole("button", { name: "Uno más" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: "Reformer 3" }));
    await fireEvent.changeText(screen.getByLabelText("¿Qué pasó?"), "El resorte rojo se soltó.");
    await fireEvent.press(screen.getByRole("checkbox", { name: "No se puede usar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Enviar reporte" }));

    await waitFor(() => expect(screen.getByText("Gracias por avisar")).toBeOnTheScreen());
    expect(
      screen.getByText(
        "Administración ya puede ver la falla del Reformer 3 y lo marcará cuando esté resuelto.",
      ),
    ).toBeOnTheScreen();
    expect(postedBody(fetcher)).toEqual([
      { equipmentId: "reformer-3", description: "El resorte rojo se soltó.", outOfService: true },
    ]);

    await fireEvent.press(screen.getByRole("button", { name: "Volver a la lista" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reportar una falla" })).toBeOnTheScreen(),
    );
  });

  it("forgets the chosen unit when another type is chosen", async () => {
    const screen = await openReport(routeFetcher(routes(studio())));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reformer 3" })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Reformer 3" }));
    await fireEvent.changeText(screen.getByLabelText("¿Qué pasó?"), "Se soltó.");
    await fireEvent.press(screen.getByRole("button", { name: "Mat" }));
    await fireEvent.press(screen.getByRole("button", { name: "Reformer" }));
    expect(screen.getByRole("button", { name: "Reformer 3" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeDisabled();
  });

  it("says when the Branch has no Equipment registered", async () => {
    const screen = await openReport(
      routeFetcher(routes([unitType("Reformer", []), quantityType("Balones", 0, 0)])),
    );
    await waitFor(() => expect(screen.getByText("Sin equipos registrados")).toBeOnTheScreen());
    expect(screen.queryByRole("button", { name: "Reformer" })).toBeNull();
  });
});
