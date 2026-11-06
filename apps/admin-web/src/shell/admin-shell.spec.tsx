import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
import { pendingBadgeHandler } from "../test/payment-fixtures";
import {
  payrollStaffHandler,
  salaryPage,
  salaryPaymentsPath,
} from "../test/payroll-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const renderShell = (path = "/") => renderAdmin(path);

const destinations = [
  "Inicio",
  "Horario",
  "Clientas",
  "Promociones",
  "Comentarios",
  "Dinero",
  "Estudio",
  "Informes",
  "Ajustes",
];

// Follow-up 232 (P01–P09): the icon rail, the top bar with the global
// search, and each destination's pages as tabs.
describe("admin shell", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers(), ...emptyPageHandlers()));

  const heading = (name: string | RegExp) =>
    screen.findByRole("heading", { level: 1, name });
  const rail = () => screen.getByRole("navigation", { name: "Secciones" });

  describe("on a desktop browser", () => {
    it("shows the nine destinations in the rail with the current one marked", async () => {
      renderShell("/");
      await heading(/^Buen/);

      expect(
        within(rail())
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(destinations);
      expect(
        within(rail()).getByRole("link", { name: "Inicio" }),
      ).toHaveAttribute("aria-current", "page");
      // FIX-042 (decisiones §20.24): no «E» above the rail; it starts at
      // Inicio and the brand stays in the top bar.
      expect(
        within(rail()).queryByRole("img", { name: "Emma Pilates Studio" }),
      ).toBeNull();
      expect(rail().firstElementChild).toHaveAccessibleName("Inicio");
      expect(
        screen.queryByRole("button", { name: "Abrir menú" }),
      ).not.toBeInTheDocument();
    });

    it("opens a destination on its first tab and moves between its tabs", async () => {
      const { user, router } = renderShell("/");
      await heading(/^Buen/);

      await user.click(within(rail()).getByRole("link", { name: "Dinero" }));

      await heading("Pagos");
      expect(router.state.location.pathname).toBe("/dinero/pagos");
      expect(
        within(rail()).getByRole("link", { name: "Dinero" }),
      ).toHaveAttribute("aria-current", "page");
      const tabs = screen.getByRole("navigation", {
        name: "Páginas de Dinero",
      });
      expect(
        within(tabs)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(["Pagos", "Caja", "Sueldos", "Gastos"]);
      expect(within(tabs).getByRole("link", { name: "Pagos" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      await user.click(within(tabs).getByRole("link", { name: "Gastos" }));
      await heading("Gastos");
      expect(
        within(tabs).getByRole("link", { name: "Gastos" }),
      ).toHaveAttribute("aria-current", "page");
    });

    it("keeps the tab marked on its other views and switches between them", async () => {
      server.use(
        http.get(apiUrl(salaryPaymentsPath), () =>
          jsonResponse(salaryPage([])),
        ),
        payrollStaffHandler(),
        http.get(apiUrl("/api/v1/administrator/pay-statements"), () =>
          jsonResponse([]),
        ),
      );
      const { user } = renderShell("/dinero/sueldos/pagados");
      await heading("Nómina");

      // The page header draws the views, so each look-up reads the current one.
      const views = () =>
        screen.getByRole("navigation", { name: "Vistas de Sueldos" });
      expect(
        within(views())
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(["Por aprobar", "Pagados"]);
      expect(
        within(views()).getByRole("link", { name: "Pagados" }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        within(
          screen.getByRole("navigation", { name: "Páginas de Dinero" }),
        ).getByRole("link", { name: "Sueldos" }),
      ).toHaveAttribute("aria-current", "page");

      await user.click(
        within(views()).getByRole("link", { name: "Por aprobar" }),
      );

      await heading("Sueldos por aprobar");
      expect(
        within(views()).getByRole("link", { name: "Por aprobar" }),
      ).toHaveAttribute("aria-current", "page");
    });

    it("draws no tabs where the destination has one page", async () => {
      renderShell("/");
      await heading(/^Buen/);

      expect(
        screen.queryByRole("navigation", { name: /^Páginas de/ }),
      ).not.toBeInTheDocument();
    });

    it("carries the wordmark, the search, the Branch and the account in the top bar", async () => {
      renderShell("/horario");
      await heading("Horario");

      const topBar = screen.getByRole("banner");
      expect(within(topBar).getByText("Emma")).toBeInTheDocument();
      expect(within(topBar).getByText("Pilates Studio")).toBeInTheDocument();
      expect(
        within(topBar).getByRole("combobox", { name: "Buscar en todo" }),
      ).toHaveAttribute(
        "placeholder",
        "Buscar una clienta, una clase, un pago o una página",
      );
      expect(
        await within(topBar).findByRole("button", { name: "Sucursal Centro" }),
      ).toBeInTheDocument();
      expect(
        await within(topBar).findByRole("button", {
          name: "Tu cuenta: Paola Mendoza",
        }),
      ).toBeInTheDocument();
    });

    it("titles the document after the page and moves focus to the content on navigation, behind a skip link", async () => {
      const { user } = renderShell("/");
      await heading(/^Buen/);
      expect(document.title).toBe("Inicio · Emma");
      const skip = screen.getByRole("link", { name: "Saltar al contenido" });
      expect(skip).toHaveAttribute("href", "#contenido");
      expect(screen.getByRole("main")).toHaveAttribute("id", "contenido");

      await user.click(within(rail()).getByRole("link", { name: "Horario" }));
      await heading("Horario");

      expect(document.title).toBe("Horario · Clases · Emma");
      await waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
    });

    it("counts what waits on the destination and on its tab", async () => {
      server.use(pendingBadgeHandler(3));
      renderShell("/dinero/gastos");
      await heading("Gastos");

      expect(
        await within(rail()).findByRole("link", {
          name: "Dinero, 3 por revisar",
        }),
      ).toBeInTheDocument();
      expect(
        within(
          screen.getByRole("navigation", { name: "Páginas de Dinero" }),
        ).getByRole("link", { name: "Pagos, 3 por revisar" }),
      ).toBeInTheDocument();
    });

    it("shows no count beside Dinero or Estudio when either read fails", async () => {
      server.use(
        http.get(apiUrl("/api/v1/administrator/payments"), () =>
          problemResponse(500, "unexpected_error"),
        ),
        http.get(apiUrl("/api/v1/administrator/supplies"), () =>
          problemResponse(500, "unexpected_error"),
        ),
      );
      renderShell("/");
      await heading(/^Buen/);

      // The retry policy gives a 5xx one more try before the badge gives up.
      await waitFor(
        () => expect(screen.queryByRole("status")).not.toBeInTheDocument(),
        { timeout: 5_000 },
      );
      expect(
        within(rail()).getByRole("link", { name: "Dinero" }),
      ).toHaveTextContent(/^Dinero$/);
      expect(
        within(rail()).getByRole("link", { name: "Estudio" }),
      ).toHaveTextContent(/^Estudio$/);
    });
  });

  describe("on a narrow browser", () => {
    useNarrowViewport();

    it("opens the nine destinations from the menu button and closes after navigating", async () => {
      const { user } = renderShell("/");
      await heading(/^Buen/);

      expect(
        screen.queryByRole("navigation", { name: "Secciones" }),
      ).not.toBeInTheDocument();
      expect(
        within(screen.getByRole("banner")).getByText("Emma"),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Abrir menú" }));

      const drawer = await screen.findByRole("dialog", { name: "Menú" });
      expect(
        within(drawer)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(destinations);
      await user.click(within(drawer).getByRole("link", { name: "Estudio" }));

      await heading("Personal");
      expect(
        screen.queryByRole("dialog", { name: "Menú" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("navigation", { name: "Páginas de Estudio" }),
      ).toBeInTheDocument();
    });

    it("closes the menu from its own button", async () => {
      const { user } = renderShell("/");
      await heading(/^Buen/);

      await user.click(screen.getByRole("button", { name: "Abrir menú" }));
      const drawer = await screen.findByRole("dialog", { name: "Menú" });
      await user.click(
        within(drawer).getByRole("button", { name: "Cerrar menú" }),
      );

      expect(
        screen.queryByRole("dialog", { name: "Menú" }),
      ).not.toBeInTheDocument();
    });
  });
});
