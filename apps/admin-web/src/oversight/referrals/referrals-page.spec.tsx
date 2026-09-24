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
  andreaReferredCamila,
  andreaReferredValeria,
  referralPage,
  referralRow,
  referralsPath,
} from "../../test/oversight-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const reads: URLSearchParams[] = [];
const referralTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(referralsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const path = "/promociones/referidos";
const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Referidos" });

describe("AW26 Referidos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists every Referral of the studio read-only with its state and the studio counts", async () => {
    server.use(
      referralTable(() =>
        jsonResponse(
          referralPage([andreaReferredValeria, andreaReferredCamila], {
            totalItems: 34,
          }),
        ),
      ),
    );
    const { user } = renderAdmin(path);
    await heading();

    expect(screen.getByText("Cargando referidos…")).toBeInTheDocument();
    const pending = (
      await screen.findByRole("cell", { name: /Valeria Terceros/ })
    ).parentElement as HTMLElement;
    expect(
      within(pending).getByRole("cell", { name: /Andrea Céspedes/ }),
    ).toHaveAttribute("data-label", "Cliente que refiere");
    expect(within(pending).getByText("3 referidas en total")).toBeVisible();
    expect(
      within(pending).getByRole("cell", { name: "11/08/2026" }),
    ).toHaveAttribute("data-label", "Fecha de registro");
    expect(within(pending).getByText("Pendiente")).toBeInTheDocument();
    const awarded = screen.getByRole("cell", { name: /Camila Vargas Ortiz/ })
      .parentElement as HTMLElement;
    expect(within(awarded).getByText("Crédito otorgado")).toBeInTheDocument();
    expect(
      screen.getByText("34 referidos · 27 con crédito otorgado, 7 pendientes"),
    ).toBeVisible();
    expect(screen.getByText("Mostrando 1–20 de 34 referidos")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Nuevo/ })).toBeNull();

    await user.click(within(awarded).getByText("Camila Vargas Ortiz"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(Object.fromEntries(reads[0] ?? [])).toEqual({
      page: "1",
      pageSize: "20",
    });
  });

  it("names a referrer's single Referral in the singular", async () => {
    server.use(
      referralTable(() =>
        jsonResponse(
          referralPage(
            [referralRow("03", "Mariana Paz Suárez", "Lucía Mendoza")],
            {
              awardedCount: 1,
              pendingCount: 0,
            },
          ),
        ),
      ),
    );
    renderAdmin(path);

    expect(await screen.findByText("1 referida en total")).toBeVisible();
    expect(
      screen.getByText("1 referido · 1 con crédito otorgado, 0 pendientes"),
    ).toBeVisible();
  });

  it("searches either Client by name and keeps the search in the address", async () => {
    server.use(
      referralTable((params) =>
        jsonResponse(
          params.get("query") === "valeria"
            ? referralPage([andreaReferredValeria])
            : referralPage([andreaReferredValeria, andreaReferredCamila]),
        ),
      ),
    );
    const { router, user } = renderAdmin(`${path}?page=2`);
    await screen.findByRole("cell", { name: /Camila Vargas Ortiz/ });

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar por nombre de cliente" }),
      "valeria",
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: /Camila Vargas Ortiz/ }),
      ).not.toBeInTheDocument(),
    );
    expect(reads.at(-1)?.get("query")).toBe("valeria");
    expect(reads.at(-1)?.get("page")).toBe("1");
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      q: "valeria",
    });
    // The studio counts do not follow the search.
    expect(
      screen.getByText("34 referidos · 27 con crédito otorgado, 7 pendientes"),
    ).toBeVisible();
  });

  it("says a search found nothing without offering to create a Referral", async () => {
    server.use(referralTable(() => jsonResponse(referralPage([]))));
    renderAdmin(`${path}?q=rodrigues`);

    const table = await screen.findByRole("table");
    expect(
      await within(table).findByText("No se encontró ningún referido."),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(
        "Revisa cómo escribiste el nombre de la clienta.",
      ),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(
        "Un referido nace cuando una clienta se registra con el código de otra.",
      ),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Estado" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin resultados")).toBeVisible();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("says when the studio has no Referrals yet", async () => {
    server.use(
      referralTable(() =>
        jsonResponse(referralPage([], { awardedCount: 0, pendingCount: 0 })),
      ),
    );
    renderAdmin(path);

    expect(
      await screen.findByText("Todavía no hay referidos."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Todavía no hay referidos en el estudio"),
    ).toBeVisible();
  });

  it("offers a retry when the list cannot load", async () => {
    server.use(referralTable(() => problemResponse(500, "unexpected_error")));
    renderAdmin(path);

    expect(
      await screen.findByText(
        "No pudimos cargar los referidos.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      referralTable(() => problemResponse(403, "administration_access_denied")),
    );
    renderAdmin(path);

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
  });

  it("stays studio-wide when the Branch selector changes", async () => {
    server.use(
      referralTable(() => jsonResponse(referralPage([andreaReferredCamila]))),
    );
    const { user } = renderAdmin(path);
    await screen.findByRole("cell", { name: /Camila Vargas Ortiz/ });

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    const popover = await screen.findByRole("dialog", { name: "Sucursal" });
    expect(
      within(popover).getByText(
        "Esta página no se filtra por sucursal — los referidos son del estudio, no de una sede.",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(popover).getByRole("option", { name: /Equipetrol/ }),
    );

    expect(
      await screen.findByRole("button", { name: "Sucursal Equipetrol" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: /Camila Vargas Ortiz/ }),
    ).toBeVisible();
    expect(reads).toHaveLength(1);
    expect(reads[0]?.has("branchId")).toBe(false);
  });
});

describe("AW26 Referidos on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the search above one labelled card per Referral", async () => {
    server.use(
      referralTable(() => jsonResponse(referralPage([andreaReferredValeria]))),
    );
    renderAdmin(path);

    const referred = await screen.findByRole("cell", {
      name: "Valeria Terceros",
    });
    expect(referred).toHaveAttribute("data-label", "Cliente referido");
    expect(
      screen.getByRole("searchbox", { name: "Buscar por nombre de cliente" }),
    ).toBeVisible();
  });
});
