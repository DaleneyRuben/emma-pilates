import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  ana,
  clientPage,
  clientsPath,
  lucia,
  sofia,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const reads: URLSearchParams[] = [];
const clientTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(clientsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Clientes" });

describe("AW21 Clientes on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists every Client read-only with the studio counts in the feminine", async () => {
    server.use(
      clientTable(() => jsonResponse(clientPage([ana, lucia, sofia]))),
    );
    renderAdmin("/back-office/clientes");
    await heading();

    expect(screen.getByText("Cargando clientas…")).toBeInTheDocument();
    const row = (await screen.findByRole("cell", { name: /Lucía Fernández/ }))
      .parentElement as HTMLElement;
    expect(
      within(row).getByRole("cell", { name: /lucia@example.com/ }),
    ).toHaveAttribute("data-label", "Contacto");
    expect(
      within(row).getByRole("cell", { name: "Paquete de 8 clases" }),
    ).toBeInTheDocument();
    expect(within(row).getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("148 clientas · 96 con plan activo")).toBeVisible();
    expect(screen.getByText("Mostrando 3 de 148 clientas")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Nuevo/ }),
    ).not.toBeInTheDocument();
    expect(reads[0]?.get("page")).toBe("1");
    expect(reads[0]?.has("q")).toBe(false);
  });

  it("marks an expired Plan and a Client who never had one", async () => {
    server.use(clientTable(() => jsonResponse(clientPage([ana, sofia]))));
    renderAdmin("/back-office/clientes");

    const expired = (await screen.findByRole("cell", { name: /Sofía Guzmán/ }))
      .parentElement as HTMLElement;
    // UX-012 / A5: an expired Plan is «Vencido»; never bought stays the neutral pill.
    expect(within(expired).getByText("Vencido")).toBeInTheDocument();
    expect(
      within(expired).queryByText("Sin plan activo"),
    ).not.toBeInTheDocument();
    expect(within(expired).getByText("Expirado")).toBeInTheDocument();
    const never = screen.getByRole("cell", { name: /Ana Quiroga/ })
      .parentElement as HTMLElement;
    expect(within(never).getByText("Sin plan")).toBeInTheDocument();
    expect(within(never).queryByText("Expirado")).not.toBeInTheDocument();
  });

  it("keeps the search in the address and sends it to the backend", async () => {
    server.use(
      clientTable((params) =>
        jsonResponse(
          params.get("q") === "lucia"
            ? clientPage([lucia])
            : clientPage([ana, lucia, sofia]),
        ),
      ),
    );
    const { router, user } = renderAdmin("/back-office/clientes?page=2");
    await screen.findByRole("cell", { name: /Ana Quiroga/ });

    await user.type(
      screen.getByRole("searchbox", {
        name: "Buscar por nombre, correo o teléfono",
      }),
      "lucia",
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: /Ana Quiroga/ }),
      ).not.toBeInTheDocument(),
    );
    expect(reads.at(-1)?.get("q")).toBe("lucia");
    expect(reads.at(-1)?.get("page")).toBe("1");
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      q: "lucia",
    });
  });

  it("says a search found no one without offering to create an account", async () => {
    server.use(clientTable(() => jsonResponse(clientPage([]))));
    renderAdmin("/back-office/clientes?q=rodrigues");

    const table = await screen.findByRole("table");
    expect(
      await within(table).findByText("No se encontró ninguna clienta."),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(
        "Revisa cómo escribiste el nombre o el teléfono.",
      ),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(
        "Las cuentas se crean desde la app del personal o cuando la clienta se registra.",
      ),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Estado" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mostrando 0 de 148 clientas")).toBeVisible();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(
      screen.getByRole("searchbox", {
        name: "Buscar por nombre, correo o teléfono",
      }),
    ).toHaveValue("rodrigues");
    expect(reads.at(-1)?.get("q")).toBe("rodrigues");
  });

  it("says when the studio has no Clients yet", async () => {
    server.use(
      clientTable(() =>
        jsonResponse(
          clientPage([], { studioClientCount: 0, activePlanClientCount: 0 }),
        ),
      ),
    );
    renderAdmin("/back-office/clientes");

    expect(
      await screen.findByText("Todavía no hay clientas."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 clientas · 0 con plan activo")).toBeVisible();
  });

  it("offers a retry when the directory cannot load", async () => {
    server.use(clientTable(() => problemResponse(500, "unexpected_error")));
    renderAdmin("/back-office/clientes");

    expect(
      await screen.findByText(
        "No pudimos cargar las clientas.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      clientTable(() => problemResponse(403, "administration_access_denied")),
    );
    renderAdmin("/back-office/clientes");

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
  });

  it("notes in the Branch selector that Clients belong to the studio", async () => {
    server.use(clientTable(() => jsonResponse(clientPage([lucia]))));
    const { user } = renderAdmin("/back-office/clientes");
    await screen.findByRole("cell", { name: /Lucía Fernández/ });

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    expect(
      await screen.findByText(/Esta página no se filtra por sucursal/),
    ).toBeInTheDocument();
  });
});

describe("AW21 Clientes on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the search above one labelled card per Client", async () => {
    server.use(clientTable(() => jsonResponse(clientPage([lucia]))));
    renderAdmin("/back-office/clientes");

    const plan = await screen.findByRole("cell", {
      name: "Paquete de 8 clases",
    });
    expect(plan).toHaveAttribute("data-label", "Plan");
    expect(
      screen.getByRole("searchbox", {
        name: "Buscar por nombre, correo o teléfono",
      }),
    ).toBeVisible();
    expect(screen.getByText("148 clientas · 96 con plan activo")).toBeVisible();
  });
});
