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
  creditPage,
  creditRow,
  creditsPath,
  danielaCredit,
  nataliaCredit,
} from "../../test/oversight-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const reads: URLSearchParams[] = [];
const creditTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(creditsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const path = "/promociones/creditos";
const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Créditos" });

describe("AW27 Créditos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists the Clients with available Credit read-only with the studio total", async () => {
    server.use(
      creditTable(() =>
        jsonResponse(creditPage([nataliaCredit, danielaCredit])),
      ),
    );
    const { user } = renderAdmin(path);
    await heading();

    expect(screen.getByText("Cargando créditos…")).toBeInTheDocument();
    const earned = (
      await screen.findByRole("cell", { name: "Natalia Aguilera" })
    ).parentElement as HTMLElement;
    const balance = within(earned).getByRole("cell", { name: "Bs 160,00" });
    expect(balance).toHaveAttribute("data-label", "Saldo de crédito");
    expect(balance).toHaveClass("md:text-right");
    expect(
      within(earned).getByRole("cell", { name: /13\/08\/2026/ }),
    ).toHaveAttribute("data-label", "Última actividad");
    expect(within(earned).getByText("Crédito ganado")).toBeVisible();
    const spent = screen.getByRole("cell", { name: "Daniela Rojas Peña" })
      .parentElement as HTMLElement;
    expect(within(spent).getByText("01/08/2026")).toBeVisible();
    expect(within(spent).getByText("Usado en un pago")).toBeVisible();
    expect(
      screen.getByText("Bs 640,00 en saldo activo · 2 clientas con crédito"),
    ).toBeVisible();
    const total = screen.getByRole("region", {
      name: "Total en saldo activo",
    });
    expect(within(total).getByText("Bs 640,00")).toBeVisible();
    expect(
      screen.getByText("Mostrando 1–2 de 2 clientas con crédito"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Nuevo/ })).toBeNull();

    await user.click(within(earned).getByText("Natalia Aguilera"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(Object.fromEntries(reads[0] ?? [])).toEqual({
      page: "1",
      pageSize: "20",
    });
  });

  it("names a Credit reserved for an open purchase and one returned to the balance", async () => {
    server.use(
      creditTable(() =>
        jsonResponse(
          creditPage([
            creditRow("03", "Gabriela Quiroga", 4_000, {
              lastMovementKind: "reserved",
            }),
            creditRow("04", "Lucía Mendoza", 2_000, {
              lastMovementKind: "returned",
            }),
          ]),
        ),
      ),
    );
    renderAdmin(path);

    expect(await screen.findByText("Reservado para un pago")).toBeVisible();
    expect(screen.getByText("Devuelto al saldo")).toBeVisible();
  });

  it("searches a Client by name and keeps the search in the address", async () => {
    server.use(
      creditTable((params) =>
        jsonResponse(
          params.get("query") === "natalia"
            ? creditPage([nataliaCredit])
            : creditPage([nataliaCredit, danielaCredit]),
        ),
      ),
    );
    const { router, user } = renderAdmin(path);
    await screen.findByRole("cell", { name: "Daniela Rojas Peña" });

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar por nombre de cliente" }),
      "natalia",
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: "Daniela Rojas Peña" }),
      ).not.toBeInTheDocument(),
    );
    expect(reads.at(-1)?.get("query")).toBe("natalia");
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      q: "natalia",
    });
    // The studio total stays; a filtered page would not add up to it.
    expect(screen.getByText("Bs 640,00 en saldo activo")).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Total en saldo activo" }),
    ).toBeNull();
    expect(
      screen.getByText("Mostrando 1–1 de 1 clienta con crédito"),
    ).toBeVisible();
  });

  it("says a search found no one", async () => {
    server.use(creditTable(() => jsonResponse(creditPage([]))));
    renderAdmin(`${path}?q=rodrigues`);

    const table = await screen.findByRole("table");
    expect(
      await within(table).findByText(
        "No se encontró ninguna clienta con crédito.",
      ),
    ).toBeInTheDocument();
    expect(
      within(table).getByText("Revisa cómo escribiste el nombre."),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Saldo de crédito" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin resultados")).toBeVisible();
  });

  it("says when no Client has Credit to spend", async () => {
    server.use(
      creditTable(() =>
        jsonResponse(creditPage([], { outstandingCentavos: 0 })),
      ),
    );
    renderAdmin(path);

    expect(
      await screen.findByText("Ninguna clienta tiene crédito disponible."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "El crédito se gana con los referidos y se usa al confirmar un pago.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bs 0,00 en saldo activo · 0 clientas con crédito"),
    ).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Total en saldo activo" }),
    ).toBeNull();
  });

  it("offers a retry when the list cannot load", async () => {
    server.use(creditTable(() => problemResponse(500, "unexpected_error")));
    renderAdmin(path);

    expect(
      await screen.findByText(
        "No pudimos cargar los créditos.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      creditTable(() => problemResponse(403, "administration_access_denied")),
    );
    renderAdmin(path);

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
  });

  it("stays studio-wide when the Branch selector changes", async () => {
    server.use(creditTable(() => jsonResponse(creditPage([nataliaCredit]))));
    const { user } = renderAdmin(path);
    await screen.findByRole("cell", { name: "Natalia Aguilera" });

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    const popover = await screen.findByRole("dialog", { name: "Sucursal" });
    expect(
      within(popover).getByText(
        "Esta página no se filtra por sucursal — los créditos son del estudio, no de una sede.",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(popover).getByRole("option", { name: /Equipetrol/ }),
    );

    expect(
      await screen.findByRole("button", { name: "Sucursal Equipetrol" }),
    ).toBeInTheDocument();
    expect(reads).toHaveLength(1);
    expect(reads[0]?.has("branchId")).toBe(false);
  });
});

describe("AW27 Créditos on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the search above one labelled card per Client and the total below", async () => {
    server.use(creditTable(() => jsonResponse(creditPage([nataliaCredit]))));
    renderAdmin(path);

    const balance = await screen.findByRole("cell", { name: "Bs 160,00" });
    expect(balance).toHaveAttribute("data-label", "Saldo de crédito");
    expect(
      screen.getByRole("searchbox", { name: "Buscar por nombre de cliente" }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Total en saldo activo" }),
    ).toBeVisible();
  });
});
