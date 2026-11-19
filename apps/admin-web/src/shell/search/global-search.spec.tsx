import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { emptyPageHandlers } from "../../test/page-handlers";
import {
  acquisitionHandler,
  clientPage,
  clientRow,
  clientsPath,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";

// FIX-091 (W9 B): «Buscar una clienta», Ctrl K. Only Clientas answer, while
// typing; a result opens her file, the last one lists every match in Clientas.
const valeria = clientRow("Valeria Quiroga", {
  phone: "+591 70011001",
  planName: "Mensual",
  remainingClassAllowance: 7,
});
const valentina = clientRow("Valentina Ríos", {
  id: "c1000000-0000-5000-8000-000000000777",
  phone: null,
  planName: null,
  subscriptionStatus: "none",
  remainingClassAllowance: null,
  originalClassAllowance: null,
});

describe("the global search", () => {
  useMockServer();

  let searched: URLSearchParams[] = [];
  const clientHandlers = () => [
    http.get(apiUrl(clientsPath), ({ request }) => {
      const params = new URL(request.url).searchParams;
      searched.push(params);
      const q = params.get("q") ?? "";
      if (q === "zz") return jsonResponse(clientPage([]));
      if (q.includes("@")) return jsonResponse(clientPage([valeria]));
      return jsonResponse(clientPage([valeria, valentina]));
    }),
    http.get(apiUrl(`${clientsPath}/:clientId`), () =>
      jsonResponse({ ...luciaDetail, id: valeria.id, name: valeria.name }),
    ),
    acquisitionHandler(),
  ];

  const heading = (name: string | RegExp) =>
    screen.findByRole("heading", { level: 1, name });
  const search = () =>
    screen.getByRole("combobox", { name: "Buscar una clienta" });
  const optionNames = () =>
    within(screen.getByRole("listbox", { name: "Clientas" }))
      .getAllByRole("option")
      .map((option) => option.textContent);

  beforeEach(() => {
    searched = [];
  });

  describe("for the Administrator", () => {
    beforeEach(() =>
      server.use(
        ...signedInHandlers(),
        ...emptyPageHandlers(),
        ...clientHandlers(),
      ),
    );

    it("asks for a Client", async () => {
      renderAdmin("/");
      await heading(/^Buen/);

      expect(search()).toHaveAttribute("placeholder", "Buscar una clienta");
    });

    it("lists the Clients while typing, with her phone and Plan", async () => {
      const { user } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "val");

      await screen.findByRole("option", { name: /^Valeria Quiroga/ });
      expect(optionNames()).toEqual([
        "Valeria Quiroga+591 70011001 · Mensual · 7 restantes",
        "Valentina RíosSin teléfono · Sin plan",
        "Ver todas las clientas con «val»",
      ]);
      expect(searched.at(-1)?.get("q")).toBe("val");
      expect(searched.at(-1)?.get("pageSize")).toBe("5");
    });

    it("offers no page, class or payment", async () => {
      const { user } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "zz");

      expect(
        await screen.findByText("Ninguna clienta con «zz»"),
      ).toBeInTheDocument();
      expect(screen.queryByRole("option")).not.toBeInTheDocument();
    });

    it("opens her file from a click on her result", async () => {
      const { user, router } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "val");
      await user.click(
        await screen.findByRole("option", { name: /^Valeria Quiroga/ }),
      );

      await screen.findByRole("dialog", { name: "Valeria Quiroga" });
      expect(router.state.location.pathname).toBe("/clientas");
      expect(search()).toHaveValue("");
    });

    it("moves through the results with the arrow keys and lists every match with Enter", async () => {
      const { user, router } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "val");
      await screen.findByRole("option", { name: /^Valeria Quiroga/ });
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");

      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(options[2]).toHaveAttribute("aria-selected", "true");
      expect(search()).toHaveAttribute("aria-activedescendant", options[2]?.id);
      await user.keyboard("{Enter}");

      await heading("Clientas");
      expect(router.state.location.pathname).toBe("/clientas");
      expect(router.state.location.search).toMatchObject({ q: "val" });
      expect(router.state.location.search).not.toHaveProperty("cliente");
    });

    it("takes focus with Ctrl K and lets Escape close the results", async () => {
      const { user } = renderAdmin("/");
      await heading(/^Buen/);

      await user.keyboard("{Control>}k{/Control}");
      expect(search()).toHaveFocus();
      await user.type(search(), "val");
      await screen.findByRole("option", { name: /^Valeria Quiroga/ });
      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("listbox", { name: "Clientas" }),
      ).not.toBeInTheDocument();
      expect(search()).toHaveValue("");
    });
  });

  describe("for the Coordinator", () => {
    beforeEach(() => server.use(...coordinatorHandlers(), ...clientHandlers()));

    it("finds Clients too", async () => {
      const { user } = renderAdmin("/");
      await heading(/^Buen/);

      await user.type(search(), "val");

      expect(
        await screen.findByRole("option", { name: /^Valeria Quiroga/ }),
      ).toBeInTheDocument();
    });
  });
});
