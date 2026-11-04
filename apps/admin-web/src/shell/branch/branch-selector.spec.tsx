import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { activeBranchesHandler, branchesPath } from "../../test/booking-handlers";
import {
  apiUrl,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { emptyPageHandlers } from "../../test/page-handlers";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const renderShell = (path: string) => renderAdmin(path);

// AW34 on the v2 top bar: one Branch at a time, «Todo el estudio» where the
// page is studio-wide (follow-up 233).
describe("the Branch selector", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers(), ...emptyPageHandlers()));

  const heading = (name: string) =>
    screen.findByRole("heading", { level: 1, name });

  describe("on a desktop browser", () => {
    it("moves through the Branch options with the arrow keys and chooses with Enter", async () => {
      const { user } = renderShell("/horario");
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

    it("switches the Branch from the selector without leaving the page or asking to confirm", async () => {
      const { user } = renderShell("/horario");
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
      const { user } = renderShell("/horario");
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

    it("shows «Todo el estudio» on a studio-wide page and keeps the Branch for the next one", async () => {
      const { user } = renderShell("/horario");
      await heading("Horario");
      await user.click(
        await screen.findByRole("button", { name: "Sucursal Centro" }),
      );
      const popover = await screen.findByRole("dialog", { name: "Sucursal" });
      await user.click(
        within(popover).getByRole("option", { name: /Equipetrol/ }),
      );

      await user.click(screen.getByRole("link", { name: "Dinero" }));
      await heading("Pagos");
      const topBar = screen.getByRole("banner");
      expect(within(topBar).getByText("Todo el estudio")).toBeInTheDocument();
      expect(
        within(topBar).queryByRole("button", { name: /^Sucursal/ }),
      ).not.toBeInTheDocument();

      await user.click(
        within(screen.getByRole("navigation", { name: "Páginas de Dinero" }))
          .getByRole("link", { name: "Caja" }),
      );
      expect(
        await within(topBar).findByRole("button", {
          name: "Sucursal Equipetrol",
        }),
      ).toBeInTheDocument();
    });

    it("reads the active Branches for the selector, so archived ones never appear", async () => {
      const requests: URLSearchParams[] = [];
      server.events.on("request:start", ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname === branchesPath) requests.push(url.searchParams);
      });
      const { user } = renderShell("/horario");
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
      const { user } = renderShell("/horario");
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
      const { user } = renderShell("/horario");
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

    it("links to the Sucursales page from the selector", async () => {
      const { user } = renderShell("/horario");
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

  describe("on a narrow browser", () => {
    useNarrowViewport();

    it("opens the Branch selector as a bottom sheet with the same rows and a title", async () => {
      const { user } = renderShell("/horario");
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
