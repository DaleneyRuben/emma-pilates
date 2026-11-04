import { screen, within } from "@testing-library/react";
import { server, useMockServer } from "../../test/msw";
import { emptyPageHandlers } from "../../test/page-handlers";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";

// Follow-up 232: «Buscar una clienta, una clase, un pago o una página»,
// Ctrl K. Pages answer from the rail itself; a name opens Clientas' search.
describe("the global search", () => {
  useMockServer();

  const heading = (name: string | RegExp) =>
    screen.findByRole("heading", { level: 1, name });
  const search = () => screen.getByRole("combobox", { name: "Buscar en todo" });

  describe("for the Administrator", () => {
    beforeEach(() =>
      server.use(...signedInHandlers(), ...emptyPageHandlers()),
    );

    it("finds a page by its name, accents aside, and opens it with Enter", async () => {
      const { user, router } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "nutricion");

      const results = screen.getByRole("listbox", { name: "Resultados" });
      expect(
        within(results)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["Horario · Nutrición", "Buscar «nutricion» en Clientas"]);
      await user.keyboard("{Enter}");

      expect(router.state.location.pathname).toBe("/horario/nutricion");
      expect(search()).toHaveValue("");
      expect(
        screen.queryByRole("listbox", { name: "Resultados" }),
      ).not.toBeInTheDocument();
    });

    it("searches Clientas for a name", async () => {
      const { user, router } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "Lucía");
      expect(
        screen.getByRole("option", { name: "Buscar «Lucía» en Clientas" }),
      ).toHaveAttribute("aria-selected", "true");
      await user.keyboard("{Enter}");

      await heading("Clientes");
      expect(router.state.location.pathname).toBe("/clientas");
      expect(router.state.location.search).toMatchObject({ q: "Lucía" });
    });

    it("moves through the results with the arrow keys", async () => {
      const { user } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "pagos");
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");

      await user.keyboard("{ArrowDown}");
      expect(options[0]).toHaveAttribute("aria-selected", "false");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
      expect(search()).toHaveAttribute("aria-activedescendant", options[1]?.id);
    });

    it("takes focus with Ctrl K and lets Escape close the results", async () => {
      const { user } = renderAdmin("/");
      await heading(/^Buen/);

      await user.keyboard("{Control>}k{/Control}");
      expect(search()).toHaveFocus();
      await user.type(search(), "caja");
      expect(
        screen.getByRole("option", { name: "Dinero · Caja" }),
      ).toBeInTheDocument();
      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("listbox", { name: "Resultados" }),
      ).not.toBeInTheDocument();
    });

    it("opens a page from a click on its result", async () => {
      const { user, router } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "reglas");
      await user.click(
        screen.getByRole("option", { name: "Ajustes · Reglas del estudio" }),
      );

      expect(router.state.location.pathname).toBe(
        "/ajustes/reglas-del-estudio",
      );
    });
  });

  describe("for the Coordinator", () => {
    beforeEach(() => server.use(...coordinatorHandlers()));

    it("never offers a page she cannot open", async () => {
      const { user } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "pagos");

      expect(
        within(screen.getByRole("listbox", { name: "Resultados" }))
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["Buscar «pagos» en Clientas"]);
    });
  });
});
