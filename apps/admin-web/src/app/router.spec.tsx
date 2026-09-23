import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { navigationGroups, navigationItems } from "./navigation";
import { createAdminRouter } from "./router";

const renderAt = (path: string) => {
  const router = createAdminRouter({
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
};

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
  it.each(navigationItems.map((item) => [item.to, item.label] as const))(
    "renders a placeholder page for %s",
    async (path, label) => {
      renderAt(path);

      expect(
        await screen.findByRole("heading", { level: 1, name: label }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Esta sección aún no está disponible."),
      ).toBeInTheDocument();
    },
  );

  it("opens the schedule at the root path", async () => {
    renderAt("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
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
