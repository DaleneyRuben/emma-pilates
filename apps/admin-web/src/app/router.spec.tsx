import { screen } from "@testing-library/react";
import { server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { navigationGroups, navigationItems } from "./navigation";

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
          "Pagos",
          "Insumos",
          "Evaluaciones nutricionales",
          "Personal",
          "Nómina",
          "Gastos",
          "Categorías de gasto",
        ],
      },
      { label: null, items: ["Reporte"] },
      { label: "Promociones", items: ["Promociones", "Referidos", "Créditos"] },
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
      "AW28",
      "AW08",
      "AW25",
      "AW23",
      "AW11",
      "AW13",
      "AW15",
      "AW16",
      "AW17",
      "AW26",
      "AW27",
    ]);
  });

  it("marks only the studio-wide pages the design system names", () => {
    expect(
      navigationItems
        .filter((item) => item.studioWide !== undefined)
        .map((item) => item.label),
    ).toEqual(["Clientes", "Pagos", "Nómina", "Referidos", "Créditos"]);
  });
});

describe("admin routes", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it.each(
    navigationItems
      .filter((item) => item.built !== true)
      .map((item) => [item.to, item.label] as const),
  )("renders a placeholder page for %s", async (path, label) => {
    renderAt(path);

    expect(
      await screen.findByRole("heading", { level: 1, name: label }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Esta sección aún no está disponible."),
    ).toBeInTheDocument();
  });

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
    expect(listPaths).toHaveLength(14);
    expect(listPaths).not.toContain("/");
    expect(listPaths).not.toContain("/reporte");

    const router = renderAt("/catalogo/planes?page=abc&pageSize=500");
    await screen.findByRole("heading", { level: 1, name: "Planes" });
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
    });

    await router.navigate({
      to: "/back-office/gastos",
      search: { page: 3, pageSize: 50 },
    });
    await screen.findByRole("heading", { level: 1, name: "Gastos" });
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(router.state.location.href).toBe(
      "/back-office/gastos?page=3&pageSize=50",
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
