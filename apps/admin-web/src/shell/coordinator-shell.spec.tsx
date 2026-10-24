import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { clientPage } from "../test/people-fixtures";
import { renderAdmin } from "../test/render-admin";
import { coordinatorHandlers } from "../test/session-handlers";

// IDN-009 / ADR-0102 (follow-up 155): the Coordinator's admin web is the
// schedule, Clientes, Personal, the counts-only Indicadores page, and the
// recommendations list. Money pages are neither shown nor opened. Descartar
// stays off her recommendations page.
describe("the admin web for the Coordinator", () => {
  useMockServer();
  beforeEach(() => server.use(...coordinatorHandlers()));

  const heading = (name: string) =>
    screen.findByRole("heading", { level: 1, name });

  it("shows only Horario, Clientes, and Personal in the sidebar", async () => {
    renderAdmin("/");
    await heading("Horario");

    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      within(sidebar)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Horario",
      "Clientes",
      "Para contactar",
      "Personal",
      "Indicadores",
      "Recomendaciones",
    ]);
    expect(within(sidebar).queryByText("Catálogo")).not.toBeInTheDocument();
    expect(within(sidebar).queryByText("Promociones")).not.toBeInTheDocument();
  });

  it.each([
    "/back-office/pagos",
    "/reporte",
    "/back-office/nomina",
    "/catalogo/planes",
    "/promociones",
    "/simulador",
    "/back-office/pago-coordinadora",
    "/back-office/clientes/campana",
  ])("returns %s to Horario with the notice", async (path) => {
    const { router } = renderAdmin(path);

    await heading("Horario");
    expect(
      await screen.findByText("Esa sección es solo para administración."),
    ).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });

  it("opens Indicadores with counts and no amount", async () => {
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
    );
    renderAdmin("/reporte/indicadores");

    await heading("Indicadores");
    expect(
      await screen.findByRole("region", { name: "Ocupación" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Bs/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Simulador" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Reporte" })).toBeNull();
    expect(screen.getByRole("link", { name: "Recomendaciones" })).toBeVisible();
  });

  it("opens Recomendaciones without Descartar", async () => {
    server.use(
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
    renderAdmin("/recomendaciones");

    await heading("Recomendaciones");
    expect(
      await screen.findByText(
        "Revisa el horario del martes: promedia 1,7 alumnas.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Descartar" })).toBeNull();
    expect(screen.queryByText(/Bs/)).not.toBeInTheDocument();
  });

  it("opens Clientes", async () => {
    server.use(
      http.get(apiUrl("/api/v1/administrator/clients"), () =>
        jsonResponse(clientPage([])),
      ),
    );
    renderAdmin("/back-office/clientes");

    await heading("Clientes");
    expect(
      screen.queryByRole("link", { name: "Dar clases de campaña" }),
    ).not.toBeInTheDocument();
  });

  it("names her Role in the account menu", async () => {
    const { user } = renderAdmin("/");
    await heading("Horario");

    await user.click(
      await screen.findByRole("button", { name: /Carolina Rivas/ }),
    );
    expect(await screen.findByText("Coordinación")).toBeInTheDocument();
  });
});
