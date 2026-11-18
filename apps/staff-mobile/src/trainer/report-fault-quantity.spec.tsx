import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  openReport,
  postedBody,
  quantityType,
  routes,
  type SessionType,
  unit,
  unitType,
} from "./report-fault-fixtures";

const studio = (usable: number, quantity = usable): SessionType[] => [
  unitType("Reformer", [unit("Reformer", 3)]),
  quantityType("Balones", usable, quantity),
];

const chooseBalones = async (screen: Awaited<ReturnType<typeof openReport>>) => {
  await waitFor(() => expect(screen.getByRole("button", { name: "Balones" })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: "Balones" }));
};

// S26 (FIX-067): a by-quantity type is reported as how many were damaged.
describe("Trainer damage report for a quantity type", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("counts the damaged ones between one and the usable ones and sends them", async () => {
    const fetcher = routeFetcher(routes(studio(3, 4)));
    const screen = await openReport(fetcher);
    await chooseBalones(screen);

    expect(screen.getByText("Hay 3 que se pueden usar")).toBeOnTheScreen();
    expect(screen.getByText("¿Cuántos se dañaron?")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Ej.: uno se pinchó")).toBeOnTheScreen();
    expect(screen.queryByRole("checkbox", { name: "No se puede usar" })).toBeNull();
    expect(screen.getByTestId("report-fault-count")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Uno menos" })).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: "Uno más" }));
    await fireEvent.press(screen.getByRole("button", { name: "Uno más" }));
    expect(screen.getByTestId("report-fault-count")).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Uno más" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Uno menos" }));
    expect(screen.getByTestId("report-fault-count")).toHaveTextContent("2");

    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("¿Qué pasó?"), "Se pincharon dos.");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar reporte" }));

    await waitFor(() => expect(screen.getByText("Gracias por avisar")).toBeOnTheScreen());
    expect(
      screen.getByText(
        "Administración ya puede ver el daño de Balones (2) y lo marcará cuando esté resuelto.",
      ),
    ).toBeOnTheScreen();
    expect(postedBody(fetcher)).toEqual([
      { typeId: "type-balones", quantity: 2, description: "Se pincharon dos." },
    ]);
  });

  it("says a quantity type with none usable has nothing to report", async () => {
    const screen = await openReport(routeFetcher(routes(studio(0, 5))));
    await chooseBalones(screen);

    expect(
      screen.getByText("No hay ninguno que se pueda usar: ya están todos reportados."),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Uno más" })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("¿Qué pasó?"), "Se pinchó.");
    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeDisabled();
  });

  it("refreshes and says how many are left when others reported them first", async () => {
    let usable = 3;
    const fetcher = routeFetcher(
      routes(
        () => studio(usable, 3),
        () => {
          usable = 1;
          return jsonResponse({ code: "equipment_damage_exceeds_usable", status: 409 }, 409);
        },
      ),
    );
    const screen = await openReport(fetcher);
    await chooseBalones(screen);
    await fireEvent.press(screen.getByRole("button", { name: "Uno más" }));
    await fireEvent.changeText(screen.getByLabelText("¿Qué pasó?"), "Se pincharon dos.");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar reporte" }));

    await waitFor(() =>
      expect(screen.getByText("Solo hay 1 que se pueden usar.")).toBeOnTheScreen(),
    );
    expect(screen.getByText("Hay 1 que se pueden usar")).toBeOnTheScreen();
    expect(screen.getByTestId("report-fault-count")).toHaveTextContent("1");
    expect(screen.queryByText("Gracias por avisar")).toBeNull();
  });
});
