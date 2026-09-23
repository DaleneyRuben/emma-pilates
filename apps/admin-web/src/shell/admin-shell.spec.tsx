import { screen, within } from "@testing-library/react";
import { server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";
import type { Branch } from "./branch/branch-context";

const branches: Branch[] = [
  { id: "centro", name: "Centro", address: "Calle Ayacucho 245" },
  { id: "equipetrol", name: "Equipetrol", address: "Av. San Martín 1120" },
  { id: "urubo", name: "Urubó", address: "Condominio Los Tajibos" },
];

const renderShell = (path = "/") => renderAdmin(path, { branches });

useMockServer();
beforeEach(() => server.use(...signedInHandlers()));

const heading = (name: string) =>
  screen.findByRole("heading", { level: 1, name });

describe("admin shell on a desktop browser", () => {
  it("shows the sidebar groups in order with the current page marked", async () => {
    renderShell("/");
    await heading("Horario");

    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      within(sidebar)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Horario",
      "Tipos de clase",
      "Planes",
      "Sucursales",
      "Clientes",
      "Pagos",
      "Insumos",
      "Evaluaciones nutricionales",
      "Personal",
      "Nómina",
      "Gastos",
      "Categorías de gasto",
      "Reporte",
      "Promociones",
      "Referidos",
      "Créditos",
    ]);
    expect(within(sidebar).getByText("Catálogo")).toBeInTheDocument();
    expect(within(sidebar).getByText("Back Office")).toBeInTheDocument();
    expect(within(sidebar).queryByText("Descuentos")).not.toBeInTheDocument();
    expect(
      within(sidebar).getByRole("link", { name: "Horario" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.queryByRole("button", { name: "Abrir menú" }),
    ).not.toBeInTheDocument();
  });

  it("navigates from the sidebar and moves the current marker", async () => {
    const { user } = renderShell("/");
    await heading("Horario");

    await user.click(screen.getByRole("link", { name: "Planes" }));

    await heading("Planes");
    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      within(sidebar).getByRole("link", { name: "Planes" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Horario" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps the wordmark, the Branch cell, and the account cell in the top bar", async () => {
    renderShell("/");
    await heading("Horario");

    const topBar = screen.getByRole("banner");
    expect(within(topBar).getByText("Emma")).toBeInTheDocument();
    expect(
      within(topBar).getByRole("button", { name: "Sucursal Centro" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(within(topBar).getByText("Administradora")).toBeInTheDocument();
  });

  it("switches the Branch from the selector without leaving the page or asking to confirm", async () => {
    const { user } = renderShell("/");
    await heading("Horario");

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));

    const popover = await screen.findByRole("dialog", { name: "Sucursal" });
    const options = within(popover).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "CentroCalle Ayacucho 245",
      "EquipetrolAv. San Martín 1120",
      "UrubóCondominio Los Tajibos",
    ]);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[2]).toHaveAttribute("aria-selected", "false");
    expect(
      within(popover).queryByText("Todas las sucursales"),
    ).not.toBeInTheDocument();
    expect(
      within(popover).queryByText(/no se filtra por sucursal/),
    ).not.toBeInTheDocument();

    await user.click(within(popover).getByRole("option", { name: /Urubó/ }));

    expect(
      screen.queryByRole("dialog", { name: "Sucursal" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sucursal Urubó" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
  });

  it("closes the selector with Escape and keeps the Branch", async () => {
    const { user } = renderShell("/");
    await heading("Horario");

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await screen.findByRole("dialog", { name: "Sucursal" });
    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Sucursal" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sucursal Centro" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("says when the page is studio-wide but still lets the Branch change for the next page", async () => {
    const { user } = renderShell("/back-office/pagos");
    await heading("Pagos");

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));

    const popover = await screen.findByRole("dialog", { name: "Sucursal" });
    expect(
      within(popover).getByText(
        "Esta página no se filtra por sucursal — los pagos son del estudio, no de una sede.",
      ),
    ).toBeInTheDocument();
    expect(
      within(popover).getByRole("option", { name: /Equipetrol/ }),
    ).toBeEnabled();

    await user.click(
      within(popover).getByRole("option", { name: /Equipetrol/ }),
    );
    expect(
      screen.getByRole("button", { name: "Sucursal Equipetrol" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Insumos" }));
    await heading("Insumos");
    expect(
      screen.getByRole("button", { name: "Sucursal Equipetrol" }),
    ).toBeInTheDocument();
  });

  it("links to the Sucursales page from the selector", async () => {
    const { user } = renderShell("/");
    await heading("Horario");

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    const popover = await screen.findByRole("dialog", { name: "Sucursal" });
    await user.click(
      within(popover).getByRole("link", { name: "Gestionar sucursales" }),
    );

    await heading("Sucursales");
    expect(
      screen.queryByRole("dialog", { name: "Sucursal" }),
    ).not.toBeInTheDocument();
  });
});

describe("admin shell on a narrow browser", () => {
  useNarrowViewport();

  it("collapses the sidebar behind a hamburger drawer that closes after navigating", async () => {
    const { user } = renderShell("/");
    await heading("Horario");

    expect(
      screen.queryByRole("navigation", { name: "Secciones" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    const drawer = await screen.findByRole("dialog", { name: "Menú" });
    await user.click(within(drawer).getByRole("link", { name: "Gastos" }));

    await heading("Gastos");
    expect(
      screen.queryByRole("dialog", { name: "Menú" }),
    ).not.toBeInTheDocument();
  });

  it("opens the Branch selector as a bottom sheet with the same rows", async () => {
    const { user } = renderShell("/");
    await heading("Horario");

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));

    const sheet = await screen.findByRole("dialog", { name: "Sucursal" });
    expect(sheet).toHaveAttribute("data-side", "bottom");
    await user.click(within(sheet).getByRole("option", { name: /Equipetrol/ }));

    expect(
      screen.queryByRole("dialog", { name: "Sucursal" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sucursal Equipetrol" }),
    ).toBeInTheDocument();
  });
});
