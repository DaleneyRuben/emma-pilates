import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  ana,
  clientPage,
  clientRow,
  clientsPath,
  sofia,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";

const foundersPath = "/api/v1/administrator/founder-memberships";

const isabel = clientRow("Isabel Arce", {
  planName: "Mensual 16 clases",
  remainingClassAllowance: 9,
  originalClassAllowance: 16,
  planEndsOn: "2026-10-09",
  founderNumber: 2,
  invitedByName: "Carla Rojas",
});
const mariana = clientRow("Mariana Peña", {
  ...ana,
  id: "c1000000-0000-5000-8000-0000000000aa",
  name: "Mariana Peña",
  accountStatus: "active",
  invitedByName: "Sofía Guzmán",
});

const reads: URLSearchParams[] = [];
const clientTable = () =>
  http.get(apiUrl(clientsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return jsonResponse(
      clientPage(
        params.get("filter") === "founder"
          ? [isabel]
          : [isabel, mariana, sofia],
        { founderClientCount: 2 },
      ),
    );
  });

const founderReads: string[] = [];
const foundersHandler = () =>
  http.get(apiUrl(foundersPath), ({ request }) => {
    founderReads.push(request.url);
    return jsonResponse({ granted: 3, places: 40, items: [] });
  });

const chip = (name: string) =>
  within(screen.getByRole("group", { name: "Filtrar clientas" })).getByRole(
    "button",
    { name },
  );

// WEB-040 (follow-up 232): Fundadora is a chip on Todas instead of a page,
// and the list says what is left, when it ends, and who invited her.
describe("Clientas › Todas chips and columns", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    founderReads.length = 0;
  });

  it("filters by one chip kept in the address, Todas being none", async () => {
    server.use(...signedInHandlers(), clientTable(), foundersHandler());
    const { router, user } = renderAdmin("/clientas?page=2");
    await screen.findByRole("cell", { name: /Mariana Peña/ });

    expect(
      ["Todas", "Con plan", "Sin plan", "Expirado", "Fundadora"].map((name) =>
        chip(name).getAttribute("aria-pressed"),
      ),
    ).toEqual(["true", "false", "false", "false", "false"]);
    expect(reads.at(-1)?.has("filter")).toBe(false);

    await user.click(chip("Fundadora"));
    await waitFor(() => expect(reads.at(-1)?.get("filter")).toBe("founder"));
    expect(reads.at(-1)?.get("page")).toBe("1");
    expect(chip("Fundadora")).toHaveAttribute("aria-pressed", "true");
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      filter: "founder",
    });

    await user.click(chip("Expirado"));
    await waitFor(() => expect(reads.at(-1)?.get("filter")).toBe("expired"));

    await user.click(chip("Todas"));
    await waitFor(() => expect(reads.at(-1)?.has("filter")).toBe(false));
  });

  it("shows what is left, when it ends, who invited her, and the Fundadora number", async () => {
    server.use(...signedInHandlers(), clientTable());
    renderAdmin("/clientas");

    const row = (await screen.findByRole("cell", { name: /Isabel Arce/ }))
      .parentElement as HTMLElement;
    expect(within(row).getByText("Fundadora n.º 2")).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "9 de 16" })).toHaveAttribute(
      "data-label",
      "Le quedan",
    );
    expect(
      within(row).getByRole("cell", { name: "09/10/2026" }),
    ).toHaveAttribute("data-label", "Vence");
    expect(
      within(row).getByRole("cell", { name: "Carla Rojas" }),
    ).toHaveAttribute("data-label", "Invitada por");

    const expired = screen.getByRole("cell", { name: /Sofía Guzmán/ })
      .parentElement as HTMLElement;
    expect(
      within(expired).getByRole("cell", { name: "Venció el 30/06/2026" }),
    ).toBeInTheDocument();
    const never = screen.getByRole("cell", { name: /Mariana Peña/ })
      .parentElement as HTMLElement;
    expect(
      within(never).getByRole("cell", { name: "Sofía Guzmán" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("148 clientas · 96 con plan activo · 2 fundadoras"),
    ).toBeVisible();
    // The founder places are read only when the Fundadora chip is on.
    expect(founderReads).toEqual([]);
  });

  it("tells the Administrator how many of the places are granted under the Fundadora chip", async () => {
    server.use(...signedInHandlers(), clientTable(), foundersHandler());
    renderAdmin("/clientas?filter=founder");

    expect(
      await screen.findByText("3 de 40 lugares de fundadora otorgados"),
    ).toBeVisible();
  });

  it.each(["/clientas/fundadoras", "/back-office/fundadoras"])(
    "opens Todas under the Fundadora chip from the old address %s",
    async (path) => {
      server.use(...signedInHandlers(), clientTable(), foundersHandler());
      const { router } = renderAdmin(path);

      await screen.findByRole("cell", { name: /Isabel Arce/ });
      expect(router.state.location.pathname).toBe("/clientas");
      expect(router.state.matches.at(-1)?.search).toMatchObject({
        filter: "founder",
      });
      expect(chip("Fundadora")).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.queryByRole("link", { name: "Fundadoras" }),
      ).not.toBeInTheDocument();
    },
  );

  it("gives the Coordinator the Fundadora chip without the founder places", async () => {
    server.use(...coordinatorHandlers(), clientTable(), foundersHandler());
    renderAdmin("/clientas/fundadoras");

    await screen.findByRole("cell", { name: /Isabel Arce/ });
    expect(chip("Fundadora")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/lugares de fundadora/)).not.toBeInTheDocument();
    expect(founderReads).toEqual([]);
  });
});
