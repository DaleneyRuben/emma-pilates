import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const kpisPath = "/api/v1/administrator/reports/kpis";

const counts = {
  sessionsHeld: 2,
  occupancyPercent: 59,
  averageStudentsTimes10: 65,
  averageAttendanceTimes10: 55,
  noShowPercent: 15,
  activeClients: 2,
  newClients: 1,
  renewedClients: 1,
  renewalPercent: 50,
};

const amounts = {
  cashCentavos: 30_000,
  accruedCentavos: 12_000,
  deferredCentavos: 27_000,
  classesStillOwed: 5,
};

const months = (body: Record<string, unknown>) =>
  http.get(apiUrl(kpisPath), () => jsonResponse(body));

describe("AW39 Indicadores", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers());
  });

  it("shows the count tiles, the money figures, and a three-month chart for an Administrator", async () => {
    server.use(months({ month: "2026-10", ...counts, ...amounts }));
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Indicadores" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Indicadores" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const occupancy = await screen.findByRole("region", { name: "Ocupación" });
    expect(within(occupancy).getByText("59 %")).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Alumnas por clase" }),
      ).getByText("6,5"),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Clientas activas" }),
      ).getByText("2"),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Renovación" })).getByText(
        "50 %",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Cobrado" })).getByText(
        "Bs 300,00",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Devengado" })).getByText(
        "Bs 120,00",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Diferido" })).getByText(
        "Bs 270,00",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("figure", { name: "Clases dictadas" }),
    ).toBeVisible();
  });

  it("hides every money figure when the payload has no centavo keys", async () => {
    server.use(months({ month: "2026-10", ...counts }));
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByRole("region", { name: "Ocupación" }),
    ).toBeVisible();
    expect(screen.queryByText(/Bs/)).toBeNull();
    expect(screen.queryByRole("region", { name: "Cobrado" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Devengado" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Diferido" })).toBeNull();
  });

  it("says the month had no classes and draws no chart when none were held", async () => {
    server.use(
      months({
        month: "2026-10",
        ...counts,
        sessionsHeld: 0,
        occupancyPercent: 0,
      }),
    );
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByText("Sin clases dictadas en este mes."),
    ).toBeVisible();
    expect(
      screen.queryByRole("figure", { name: "Clases dictadas" }),
    ).toBeNull();
  });

  it("shows the error state and retries", async () => {
    server.use(
      http.get(apiUrl(kpisPath), () =>
        problemResponse(500, "no_se_pudo", "No se pudo"),
      ),
    );
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByText("No pudimos cargar los indicadores."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});
