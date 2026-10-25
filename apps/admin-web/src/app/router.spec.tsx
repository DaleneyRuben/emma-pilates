import { act, screen } from "@testing-library/react";
import { server, useMockServer } from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { createAdminApp } from "./create-admin-app";
import { navigationGroups, navigationItems } from "./navigation";
import { pagePendingOptions } from "./page-pending";

const renderAt = (path: string) => renderAdmin(path).router;

describe("admin navigation", () => {
  it("lists the sidebar exactly as the invariants checklist orders it, without Descuentos", () => {
    expect(
      navigationGroups.map((group) => ({
        label: group.label ?? null,
        items: group.items.map((item) => item.label),
      })),
    ).toEqual([
      { label: null, items: ["Horario"] },
      { label: "Catálogo", items: ["Tipos de clase", "Planes", "Sucursales"] },
      {
        label: "Back Office",
        items: [
          "Clientes",
          "Para contactar",
          "Fundadoras",
          "Congelamientos",
          "Pagos",
          "Caja",
          "Insumos",
          "Equipos",
          "Evaluaciones nutricionales",
          "Personal",
          "Pagos a instructoras",
          "Pago a la coordinadora",
          "Nómina",
          "Gastos",
          "Categorías de gasto",
        ],
      },
      {
        label: null,
        items: ["Reporte", "Indicadores", "Recomendaciones", "Simulador"],
      },
      { label: "Promociones", items: ["Promociones", "Referidos"] },
      { label: null, items: ["Comentarios"] },
    ]);
    expect(navigationItems.map((item) => item.label)).not.toContain(
      "Descuentos",
    );
  });

  it("gives every entry a distinct path and its design screen", () => {
    const paths = navigationItems.map((item) => item.to);
    expect(new Set(paths).size).toBe(paths.length);
    expect(navigationItems.map((item) => item.screen)).toEqual([
      "AW02",
      "AW06",
      "AW04",
      "AW19",
      "AW21",
      "AW39",
      "AW40",
      "AW41",
      "AW28",
      "AW151",
      "AW08",
      "AW37",
      "AW25",
      "AW23",
      "AW11",
      "AW11",
      "AW11",
      "AW13",
      "AW15",
      "AW16",
      "AW43",
      "AW44",
      "AW42",
      "AW17",
      "AW26",
      "AW38",
      "AW36",
    ]);
  });

  it("marks only the studio-wide pages, Expense Categories included (BKO-001 D13)", () => {
    expect(
      navigationItems
        .filter((item) => item.studioWide !== undefined)
        .map((item) => item.label),
    ).toEqual([
      "Clientes",
      "Para contactar",
      "Fundadoras",
      "Congelamientos",
      "Pagos",
      "Pagos a instructoras",
      "Pago a la coordinadora",
      "Nómina",
      "Categorías de gasto",
      "Indicadores",
      "Recomendaciones",
      "Simulador",
      "Referidos",
      "Comentarios",
      "Reglas del estudio",
    ]);
  });

  it("no longer lists the retired Créditos page (PAY-005)", () => {
    expect(navigationItems.map((item) => item.label)).not.toContain("Créditos");
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

  it("opens the schedule at the root path", async () => {
    renderAt("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
  });

  it("validates the page-and-offset search of every list page and leaves the schedule and report alone", async () => {
    const listPaths = navigationItems
      .filter((item) => item.list)
      .map((item) => item.to);
    expect(listPaths).toHaveLength(15);
    expect(listPaths).not.toContain("/");
    expect(listPaths).not.toContain("/reporte");
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

  it("explains an unknown path and offers the way back to the schedule", async () => {
    renderAt("/no-existe");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Página no encontrada",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver al horario" }),
    ).toHaveAttribute("href", "/");
  });
});
