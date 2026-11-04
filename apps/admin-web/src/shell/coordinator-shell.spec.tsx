import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { clientPage } from "../test/people-fixtures";
import { renderAdmin } from "../test/render-admin";
import { coordinatorHandlers } from "../test/session-handlers";

// IDN-009 / ADR-0102 (follow-up 155) and ADR-0108 (follow-up 232): the
// Coordinator's admin web is every destination but Dinero, with only the
// tabs that hold no money. Money pages are neither shown nor opened.
// Descartar stays off her recommendations page.
describe("the admin web for the Coordinator", () => {
  useMockServer();
  beforeEach(() => server.use(...coordinatorHandlers()));

  const heading = (name: string | RegExp) =>
    screen.findByRole("heading", { level: 1, name });

  it("shows only the destinations ADR-0108 opens to her in the rail", async () => {
    renderAdmin("/");
    await heading(/^Buen/);

    const rail = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      within(rail)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Inicio",
      "Horario",
      "Clientas",
      "Promociones",
      "Comentarios",
      "Estudio",
      "Informes",
      "Ajustes",
    ]);
    expect(within(rail).queryByText("Dinero")).not.toBeInTheDocument();
  });

  it.each([
    "/dinero/pagos",
    "/informes/dinero",
    "/dinero/sueldos/pagados",
    "/ajustes/planes",
    "/ajustes/tipos-de-clase",
    "/ajustes/sucursales",
    "/ajustes/qr-del-estudio",
    "/dinero/caja",
    "/informes/simulador",
    "/dinero/sueldos?month=2026-12",
    "/promociones/clases-de-campana",
    "/back-office/pagos",
  ])("returns %s to Horario with the notice", async (path) => {
    const { router } = renderAdmin(path);

    await heading("Horario");
    expect(
      await screen.findByText("Esa sección es solo para administración."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/horario"),
    );
  });

  it("opens El mes with counts, its recommendations and no amount or Descartar", async () => {
    server.use(
      http.get(apiUrl("/api/v1/administrator/reports/kpis"), () =>
        jsonResponse({
          month: "2026-10",
          sessionsHeld: 2,
          occupancyPercent: 59,
          averageStudentsTimes10: 65,
          averageAttendanceTimes10: 55,
          noShowPercent: 15,
          activeClients: 2,
          newClients: 1,
          renewedClients: 1,
          renewalPercent: 50,
        }),
      ),
      http.get(apiUrl("/api/v1/administrator/reports/narrative"), () =>
        problemResponse(403, "studio_access_denied"),
      ),
      http.get(apiUrl("/api/v1/administrator/recommendations"), () =>
        jsonResponse({
          month: "2026-10",
          recommendations: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              rule: "weak_schedule",
              subject: "trainer:2",
              period: "2026-10-01",
              detail: "Revisa el horario del martes: promedia 1,7 alumnas.",
              state: "new",
            },
          ],
        }),
      ),
    );
    renderAdmin("/informes");

    await heading("Indicadores");
    expect(
      await screen.findByRole("region", { name: "Ocupación" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Revisa el horario del martes: promedia 1,7 alumnas.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Descartar" })).toBeNull();
    expect(screen.queryByText(/Bs/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Simulador" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Dinero" })).toBeNull();
    await waitFor(() =>
      expect(
        screen.queryByText("Cargando el informe…"),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("region", { name: "Informe del mes" }),
    ).toBeNull();
  });

  it("opens Clientes", async () => {
    server.use(
      http.get(apiUrl("/api/v1/administrator/clients"), () =>
        jsonResponse(clientPage([])),
      ),
    );
    renderAdmin("/clientas");

    await heading("Clientes");
    expect(
      screen.queryByRole("link", { name: "Dar clases de campaña" }),
    ).not.toBeInTheDocument();
  });

  it("names her Role in the account menu", async () => {
    const { user } = renderAdmin("/");
    await heading(/^Buen/);

    await user.click(
      await screen.findByRole("button", { name: /Carolina Rivas/ }),
    );
    expect(
      within(
        await screen.findByRole("dialog", { name: "Tu cuenta" }),
      ).getByText("Coordinación"),
    ).toBeInTheDocument();
  });
});
