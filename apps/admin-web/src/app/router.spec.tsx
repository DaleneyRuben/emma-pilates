import { act, screen } from "@testing-library/react";
import { server, useMockServer } from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { createAdminApp } from "./create-admin-app";
import {
  destinations,
  destinationsFor,
  movedPaths,
  navigationItems,
  placeOf,
} from "./navigation";
import { pagePendingOptions } from "./page-pending";

const renderAt = (path: string) => renderAdmin(path).router;

describe("admin navigation", () => {
  // Follow-up 232: an icon rail with nine destinations, their pages as tabs.
  it("lists the nine destinations of the rail and their tabs, in order", () => {
    expect(
      destinations.map((destination) => ({
        label: destination.label,
        tabs: destination.tabs.map((tab) => tab.label),
      })),
    ).toEqual([
      { label: "Inicio", tabs: ["Inicio"] },
      { label: "Horario", tabs: ["Clases", "Nutrición"] },
      {
        label: "Clientas",
        tabs: ["Todas", "Para contactar", "Congelamientos"],
      },
      {
        label: "Promociones",
        tabs: ["Carrusel", "Clases de campaña", "Referidos", "Contactos"],
      },
      { label: "Comentarios", tabs: ["Comentarios"] },
      { label: "Dinero", tabs: ["Pagos", "Caja", "Sueldos", "Gastos"] },
      { label: "Estudio", tabs: ["Personal", "Insumos", "Equipos"] },
      {
        label: "Informes",
        tabs: ["El mes", "Dinero", "Simulador"],
      },
      {
        label: "Ajustes",
        tabs: [
          "Tipos de clase",
          "Planes",
          "Sucursales",
          "Reglas del estudio",
          "QR del estudio",
        ],
      },
    ]);
    expect(navigationItems.map((item) => item.label)).not.toContain(
      "Descuentos",
    );
  });

  it("gives every page a distinct path and keeps the views of a tab beside it", () => {
    const paths = navigationItems.map((item) => item.to);
    expect(new Set(paths).size).toBe(paths.length);
    expect(
      navigationItems
        .filter((item) => item.views !== undefined)
        .map((item) => [item.to, item.views?.map((view) => view.to)]),
    ).toEqual([
      ["/dinero/sueldos", ["/dinero/sueldos/pagados"]],
      ["/estudio/insumos", ["/estudio/insumos/retiros"]],
    ]);
  });

  it("finds the destination and tab of a view", () => {
    expect(placeOf("/dinero/sueldos/pagados")).toMatchObject({
      destination: { label: "Dinero" },
      tab: { label: "Sueldos" },
      page: { label: "Pagados" },
    });
    expect(placeOf("/estudio/insumos/retiros")?.tab.label).toBe("Insumos");
    expect(placeOf("/no-existe")).toBeUndefined();
  });

  it("marks the studio-wide pages, where the top bar says «Todo el estudio»", () => {
    expect(
      navigationItems
        .filter((item) => item.studioWide === true)
        .map((item) => item.to),
    ).toEqual([
      "/clientas",
      "/clientas/para-contactar",
      "/clientas/congelamientos",
      "/promociones",
      "/promociones/clases-de-campana",
      "/promociones/referidos",
      "/promociones/contactos",
      "/comentarios",
      "/dinero/pagos",
      "/dinero/sueldos",
      "/dinero/sueldos/pagados",
      "/estudio/personal",
      "/informes",
      "/informes/simulador",
      "/ajustes/tipos-de-clase",
      "/ajustes/planes",
      "/ajustes/sucursales",
      "/ajustes/reglas-del-estudio",
      "/ajustes/qr-del-estudio",
    ]);
  });

  // ADR-0102 until BKO-010: operations, never money.
  it("gives the Coordinator only the pages ADR-0102 and ADR-0108 open to her", () => {
    expect(
      destinationsFor("coordinator").map((destination) => ({
        label: destination.label,
        tabs: destination.tabs.map((tab) => tab.label),
      })),
    ).toEqual([
      { label: "Inicio", tabs: ["Inicio"] },
      { label: "Horario", tabs: ["Clases", "Nutrición"] },
      {
        label: "Clientas",
        tabs: ["Todas", "Para contactar", "Congelamientos"],
      },
      { label: "Promociones", tabs: ["Carrusel", "Referidos", "Contactos"] },
      { label: "Comentarios", tabs: ["Comentarios"] },
      { label: "Estudio", tabs: ["Personal", "Insumos", "Equipos"] },
      { label: "Informes", tabs: ["El mes"] },
      { label: "Ajustes", tabs: ["Reglas del estudio"] },
    ]);
    expect(destinationsFor("administrator")).toHaveLength(9);
  });

  it("sends every address of the old sidebar to its new page", () => {
    expect(movedPaths).toEqual({
      "/catalogo/tipos-de-clase": "/ajustes/tipos-de-clase",
      "/catalogo/planes": "/ajustes/planes",
      "/catalogo/sucursales": "/ajustes/sucursales",
      "/back-office/clientes": "/clientas",
      "/back-office/clientes/campana": "/promociones/clases-de-campana",
      "/back-office/para-contactar": "/clientas/para-contactar",
      // WEB-040: Fundadora is a chip on Todas, no longer a page.
      "/back-office/fundadoras": "/clientas?filter=founder",
      "/clientas/fundadoras": "/clientas?filter=founder",
      "/back-office/congelamientos": "/clientas/congelamientos",
      "/back-office/pagos": "/dinero/pagos",
      "/back-office/caja": "/dinero/caja",
      "/back-office/insumos": "/estudio/insumos",
      "/back-office/insumos/retiros": "/estudio/insumos/retiros",
      "/back-office/equipos": "/estudio/equipos",
      "/back-office/evaluaciones-nutricionales": "/horario/nutricion",
      "/back-office/personal": "/estudio/personal",
      "/back-office/nomina": "/dinero/sueldos/pagados",
      "/back-office/pagos-instructoras": "/dinero/sueldos",
      "/back-office/pago-coordinadora": "/dinero/sueldos",
      "/back-office/gastos": "/dinero/gastos",
      "/back-office/categorias-de-gasto": "/dinero/gastos",
      "/reporte": "/informes/dinero",
      "/reporte/indicadores": "/informes",
      "/recomendaciones": "/informes",
      "/informes/recomendaciones": "/informes",
      "/dinero/gastos/categorias": "/dinero/gastos",
      "/dinero/sueldos/coordinadora": "/dinero/sueldos",
      "/simulador": "/informes/simulador",
      "/reglas-del-estudio": "/ajustes/reglas-del-estudio",
      "/dinero": "/dinero/pagos",
      "/estudio": "/estudio/personal",
      "/ajustes": "/ajustes/tipos-de-clase",
    });
    const pages = new Set(navigationItems.map((item) => item.to));
    for (const target of Object.values(movedPaths)) {
      expect(pages).toContain(target.split("?")[0]);
    }
  });
});

describe("admin router", () => {
  // WEB-035: the logo in the content area while a page's chunk is slow.
  it("shows the pending state after 400 ms and for at least 500 ms", () => {
    expect(pagePendingOptions).toMatchObject({
      defaultPendingMs: 400,
      defaultPendingMinMs: 500,
    });
    expect(pagePendingOptions).toHaveProperty("defaultPendingComponent");
    expect(createAdminApp().router.options).toMatchObject(pagePendingOptions);
  });
});

describe("admin routes", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers(), ...emptyPageHandlers()));

  it("opens Inicio at the root path and the schedule at Horario", async () => {
    const router = renderAt("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Buen/ }),
    ).toBeInTheDocument();
    await act(() => router.navigate({ to: "/horario" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
  });

  it("moves an old address to its new page and keeps its search", async () => {
    const router = renderAt("/back-office/gastos?page=2");

    await screen.findByRole("heading", { level: 1, name: "Gastos" });
    expect(router.state.location.href).toBe(
      "/dinero/gastos?page=2&pageSize=20",
    );
  });

  it("validates the page-and-offset search of every list page and leaves the schedule and report alone", async () => {
    const listPaths = navigationItems
      .filter((item) => item.list)
      .map((item) => item.to);
    expect(listPaths).toHaveLength(13);
    expect(listPaths).not.toContain("/horario");
    expect(listPaths).not.toContain("/informes/dinero");
    // AW17 is the carousel: unpaged cards, not a table (WEB-006).
    expect(listPaths).not.toContain("/promociones");

    const router = renderAt("/promociones/referidos?page=abc&pageSize=500");
    await screen.findByRole("heading", { level: 1, name: "Referidos" });
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
    });

    // A navigation outside any Testing Library call renders outside an
    // act scope, so the test holds one itself.
    await act(() =>
      router.navigate({
        to: "/promociones/referidos",
        search: { page: 3, pageSize: 50 },
      }),
    );
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(router.state.location.href).toBe(
      "/promociones/referidos?page=3&pageSize=50",
    );
  });

  it("explains an unknown path and offers the way back to Inicio", async () => {
    renderAt("/no-existe");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Página no encontrada",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver al inicio" }),
    ).toHaveAttribute("href", "/");
  });
});
