import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { activeBranchesHandler, branchesPath } from "../test/booking-handlers";
import { apiUrl, problemResponse, server, useMockServer } from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const renderShell = (path = "/") => renderAdmin(path);

describe("admin shell", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers(), ...emptyPageHandlers()));

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
        "Reporte",
        "Promociones",
        "Referidos",
        "Comentarios",
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

      await user.click(screen.getByRole("link", { name: "Promociones" }));

      await heading("Promociones");
      const sidebar = screen.getByRole("navigation", { name: "Secciones" });
      expect(
        within(sidebar).getByRole("link", { name: "Promociones" }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        within(sidebar).getByRole("link", { name: "Horario" }),
      ).not.toHaveAttribute("aria-current");
    });

    it("draws the wordmark once, in the sidebar cell, and keeps the Branch and account cells in the top bar", async () => {
      renderShell("/");
      await heading("Horario");

      // design/README.md: the "Emma" wordmark sits in the 236 px cell.
      expect(screen.getAllByText("Emma")).toHaveLength(1);
      const topBar = screen.getByRole("banner");
      expect(within(topBar).queryByText("Emma")).not.toBeInTheDocument();
      expect(
        await within(topBar).findByRole("button", { name: "Sucursal Centro" }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(
        await within(topBar).findByRole("button", {
          name: "Tu cuenta: Paola Mendoza",
        }),
      ).toBeInTheDocument();
    });

    it("titles the document after the page and moves focus to the content on navigation, behind a skip link", async () => {
      const { user } = renderShell("/");
      await heading("Horario");
      expect(document.title).toBe("Horario · Emma");
      const skip = screen.getByRole("link", { name: "Saltar al contenido" });
      expect(skip).toHaveAttribute("href", "#contenido");
      expect(screen.getByRole("main")).toHaveAttribute("id", "contenido");

      await user.click(screen.getByRole("link", { name: "Gastos" }));
      await heading("Gastos");

      expect(document.title).toBe("Gastos · Emma");
      await waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
    });

    it("moves through the Branch options with the arrow keys and chooses with Enter", async () => {
      const { user } = renderShell("/");
      await heading("Horario");

      await user.click(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      );
      const popover = await screen.findByRole("dialog", { name: "Sucursal" });
      const options = within(popover).getAllByRole("option");
      // Roving tabindex: the selected Branch is the one Tab reaches.
      expect(options.map((option) => option.tabIndex)).toEqual([0, -1, -1]);
      await waitFor(() => expect(options[0]).toHaveFocus());

      await user.keyboard("{ArrowDown}");
      expect(options[1]).toHaveFocus();
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(options[0]).toHaveFocus();
      await user.keyboard("{End}");
      expect(options[2]).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(options[1]).toHaveFocus();
      await user.keyboard("{Enter}");

      expect(
        screen.queryByRole("dialog", { name: "Sucursal" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Sucursal Equipetrol" }),
      ).toBeInTheDocument();
    });

    it("paints the main area in Superficie, as the handoff draws it", async () => {
      renderShell("/");
      await heading("Horario");

      expect(screen.getByRole("main")).toHaveClass("bg-superficie");
    });

    it("switches the Branch from the selector without leaving the page or asking to confirm", async () => {
      const { user } = renderShell("/");
      await heading("Horario");

      await user.click(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      );

      const popover = await screen.findByRole("dialog", { name: "Sucursal" });
      const options = within(popover).getAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual([
        "CentroCalle Ayacucho 245",
        "EquipetrolAv. San Martín 1120",
        "NorteAv. Banzer, 4.º anillo",
      ]);
      expect(options[0]).toHaveAttribute("aria-selected", "true");
      expect(options[2]).toHaveAttribute("aria-selected", "false");
      expect(
        within(popover).queryByText("Todas las sucursales"),
      ).not.toBeInTheDocument();
      expect(
        within(popover).queryByText(/no se filtra por sucursal/),
      ).not.toBeInTheDocument();

      await user.click(within(popover).getByRole("option", { name: /Norte/ }));

      expect(
        screen.queryByRole("dialog", { name: "Sucursal" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Sucursal Norte" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 1, name: "Horario" }),
      ).toBeInTheDocument();
    });

    it("closes the selector with Escape and keeps the Branch", async () => {
      const { user } = renderShell("/");
      await heading("Horario");

      await user.click(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      );
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

      await user.click(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      );

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

      await user.click(screen.getByRole("link", { name: "Promociones" }));
      await heading("Promociones");
      expect(
        screen.getByRole("button", { name: "Sucursal Equipetrol" }),
      ).toBeInTheDocument();
    });

    it("reads the active Branches for the selector, so archived ones never appear", async () => {
      const requests: URLSearchParams[] = [];
      server.events.on("request:start", ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname === branchesPath) requests.push(url.searchParams);
      });
      const { user } = renderShell("/");
      await heading("Horario");

      expect(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      ).toBeInTheDocument();
      await user.click(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      );
      const popover = await screen.findByRole("dialog", { name: "Sucursal" });
      expect(
        within(popover).getByRole("option", { name: /Norte/ }),
      ).toBeInTheDocument();
      expect(requests.map((params) => params.get("status"))).toContain(
        "active",
      );
      expect(requests.every((params) => params.get("pageSize") === "100")).toBe(
        true,
      );
      server.events.removeAllListeners();
    });

    it("says when there is no active Branch yet and still links to Sucursales", async () => {
      server.use(activeBranchesHandler([]));
      const { user } = renderShell("/");
      await heading("Horario");

      const trigger = await screen.findByRole("button", {
        name: "Sin sucursal",
      });
      await user.click(trigger);
      const popover = await screen.findByRole("dialog", { name: "Sucursal" });
      expect(
        within(popover).getByText("Todavía no hay sucursales activas."),
      ).toBeInTheDocument();
      expect(
        within(popover).getByRole("link", { name: "Gestionar sucursales" }),
      ).toBeInTheDocument();
    });

    it("says when the Branches could not be loaded", async () => {
      server.use(
        http.get(apiUrl(branchesPath), () =>
          problemResponse(500, "unexpected_error"),
        ),
      );
      const { user } = renderShell("/");
      await heading("Horario");

      await user.click(
        await screen.findByRole("button", { name: "Sin sucursal" }),
      );
      const popover = await screen.findByRole("dialog", { name: "Sucursal" });
      expect(
        await within(popover).findByText(
          "No pudimos cargar las sucursales. Inténtalo de nuevo.",
        ),
      ).toBeInTheDocument();
    });

    it("shows no count beside Pagos or Insumos when either read fails", async () => {
      server.use(
        http.get(apiUrl("/api/v1/administrator/payments"), () =>
          problemResponse(500, "unexpected_error"),
        ),
        http.get(apiUrl("/api/v1/administrator/supplies"), () =>
          problemResponse(500, "unexpected_error"),
        ),
      );
      renderShell("/");
      await heading("Horario");

      const sidebar = screen.getByRole("navigation", { name: "Secciones" });
      // The retry policy gives a 5xx one more try before the badge gives up.
      await waitFor(
        () => expect(screen.queryByRole("status")).not.toBeInTheDocument(),
        { timeout: 5_000 },
      );
      expect(
        within(sidebar).getByRole("link", { name: /^Pagos$/ }),
      ).toHaveTextContent(/^Pagos$/);
      expect(
        within(sidebar).getByRole("link", { name: "Insumos" }),
      ).toHaveTextContent(/^Insumos$/);
    });

    it("links to the Sucursales page from the selector", async () => {
      const { user } = renderShell("/");
      await heading("Horario");

      await user.click(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      );
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
      // Without the sidebar cell, the top bar carries the one wordmark.
      expect(
        within(screen.getByRole("banner")).getByText("Emma"),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Abrir menú" }));

      const drawer = await screen.findByRole("dialog", { name: "Menú" });
      await user.click(within(drawer).getByRole("link", { name: "Gastos" }));

      await heading("Gastos");
      expect(
        screen.queryByRole("dialog", { name: "Menú" }),
      ).not.toBeInTheDocument();
    });

    it("opens the Branch selector as a bottom sheet with the same rows and a title", async () => {
      const { user } = renderShell("/");
      await heading("Horario");

      await user.click(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      );

      const sheet = await screen.findByRole("dialog", { name: "Sucursal" });
      expect(sheet).toHaveAttribute("data-side", "bottom");
      // The sheet's label is its title, a heading like every other sheet's.
      expect(
        within(sheet).getByRole("heading", { name: "Sucursal" }),
      ).toBeInTheDocument();
      await user.click(
        within(sheet).getByRole("option", { name: /Equipetrol/ }),
      );

      expect(
        screen.queryByRole("dialog", { name: "Sucursal" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Sucursal Equipetrol" }),
      ).toBeInTheDocument();
    });
  });
});
