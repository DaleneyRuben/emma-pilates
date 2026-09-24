import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  alcohol,
  detergent,
  everySupplyHandler,
  paper,
  suppliesPath,
  supplyPage,
  supplyRow,
  wax,
  withdrawalPage,
  withdrawalRow,
  withdrawalsPath,
} from "../../test/back-office-fixtures";
import { centro, equipetrol } from "../../test/booking-handlers";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";
import { boliviaMonth, formatMonth } from "../../lib/bolivia-time";

const reads: URLSearchParams[] = [];
const history = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(withdrawalsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

// 11:00 and 18:30 in Bolivia.
const september = withdrawalPage(
  [
    withdrawalRow("02", paper, 2, "2026-09-21T22:30:00.000Z"),
    withdrawalRow("01", detergent, 5, "2026-09-21T15:00:00.000Z"),
  ],
  {
    totals: [
      { supplyId: detergent.id, supplyName: "Detergente", quantity: 5 },
      { supplyId: paper.id, supplyName: "Papel higiénico", quantity: 2 },
    ],
  },
);

const heading = () =>
  screen.findByRole("heading", {
    level: 1,
    name: "Retiros e insumos consumidos",
  });
const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name })).parentElement as HTMLElement;

describe("AW31 Retiros e insumos consumidos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
    server.use(everySupplyHandler());
  });

  it("opens on the current Bolivia month under Insumos with a way back", async () => {
    server.use(history(() => jsonResponse(withdrawalPage([]))));
    renderAdmin("/back-office/insumos/retiros");
    await heading();

    expect(await screen.findByText("Sin retiros en este rango.")).toBeVisible();
    // The empty state already says it; no "0 retiros en …" line above it.
    expect(screen.queryByText(/^0 retiros/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Prueba con otro mes o con todos los insumos."),
    ).toBeVisible();
    expect(screen.getByText(formatMonth(boliviaMonth()))).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Mes siguiente" }),
    ).toBeDisabled();
    expect(reads[0]?.get("month")).toBe(boliviaMonth());
    expect(reads[0]?.get("branchId")).toBe(centro.id);
    expect(reads[0]?.has("supplyId")).toBe(false);
    expect(
      screen.getByRole("link", { name: "Volver a Insumos" }),
    ).toHaveAttribute("href", "/back-office/insumos");
    expect(screen.getByRole("link", { name: "Insumos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("button", { name: /Nuevo|Registrar/ }),
    ).not.toBeInTheDocument();
  });

  it("lists a month's Withdrawals newest first with the units per Supply", async () => {
    server.use(history(() => jsonResponse(september)));
    renderAdmin("/back-office/insumos/retiros?month=2026-09");

    const paperRow = await rowOf("Papel higiénico");
    const quantity = within(paperRow).getByRole("cell", { name: "2" });
    expect(quantity).toHaveAttribute("data-label", "Cantidad retirada");
    expect(quantity).toHaveClass("md:text-right");
    expect(
      within(paperRow).getByRole("cell", { name: "21/09/2026 · 18:30" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 retiros en septiembre de 2026.")).toBeVisible();
    expect(
      screen.getByText("Detergente: 5 unid. · Papel higiénico: 2 unid."),
    ).toBeVisible();
    expect(screen.getByText("Mostrando 1–2 de 2 retiros")).toBeVisible();
    expect(reads[0]?.get("month")).toBe("2026-09");
  });

  it("moves between months and filters by one Supply, archived ones included, in the address", async () => {
    server.use(
      history((params) =>
        jsonResponse(
          params.get("supplyId") === detergent.id
            ? withdrawalPage([september.items[1]!], {
                totals: [september.totals[0]!],
              })
            : september,
        ),
      ),
    );
    const { router, user } = renderAdmin(
      "/back-office/insumos/retiros?month=2026-09",
    );
    await rowOf("Papel higiénico");

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(await screen.findByText("agosto de 2026")).toBeVisible();
    expect(reads.at(-1)?.get("month")).toBe("2026-08");
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));

    const filter = screen.getByLabelText("Insumo");
    expect(
      within(filter)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Todos",
      "Alcohol en gel",
      "Detergente",
      "Papel higiénico",
      "Cera (archivado)",
    ]);
    await user.selectOptions(filter, detergent.id);

    expect(
      await screen.findByText("1 retiro de Detergente en septiembre de 2026."),
    ).toBeVisible();
    expect(reads.at(-1)?.get("supplyId")).toBe(detergent.id);
    expect(router.state.matches.at(-1)?.search).toEqual({
      month: "2026-09",
      supplyId: detergent.id,
      page: 1,
      pageSize: 20,
    });
    expect(wax.archivedAt).not.toBeNull();
  });

  it("drops a Supply filter the new Branch does not know when the selector changes", async () => {
    // Equipetrol never had Detergente; its history must not stay filtered
    // by a Centro Supply the address remembers.
    server.use(
      http.get(apiUrl(suppliesPath), ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get("status") !== "all") return undefined;
        return jsonResponse(
          supplyPage(
            params.get("branchId") === equipetrol.id
              ? [supplyRow("09", "Toallas", { branchId: equipetrol.id })]
              : [alcohol, detergent, paper, wax],
            { pageSize: 100 },
          ),
        );
      }),
      history(() => jsonResponse(september)),
    );
    const { router, user } = renderAdmin(
      `/back-office/insumos/retiros?month=2026-09&supplyId=${detergent.id}`,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Insumo")).toHaveValue(detergent.id),
    );

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );

    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        month: "2026-09",
        page: 1,
        pageSize: 20,
      }),
    );
    expect(screen.getByLabelText("Insumo")).toHaveValue("all");
    expect(reads.at(-1)?.get("branchId")).toBe(equipetrol.id);
    expect(reads.at(-1)?.has("supplyId")).toBe(false);
  });

  it("reads the Branch the selector names", async () => {
    server.use(history(() => jsonResponse(september)));
    const { user } = renderAdmin("/back-office/insumos/retiros?month=2026-09");
    await rowOf("Papel higiénico");

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );
    expect(await screen.findByText("Sucursal Equipetrol")).toBeVisible();
    expect(reads.at(-1)?.get("branchId")).toBe(equipetrol.id);
  });

  it("offers a retry when the history cannot load", async () => {
    server.use(history(() => problemResponse(500, "unexpected_error")));
    renderAdmin("/back-office/insumos/retiros");
    expect(
      await screen.findByText(
        "No pudimos cargar los retiros.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("tells someone who lost access that the history is not theirs", async () => {
    server.use(
      history(() => problemResponse(403, "back_office_access_denied")),
    );
    renderAdmin("/back-office/insumos/retiros");
    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
  });
});

describe("AW31 on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(everySupplyHandler());
  });

  it("labels each card's cells", async () => {
    server.use(history(() => jsonResponse(september)));
    renderAdmin("/back-office/insumos/retiros?month=2026-09");
    const row = await rowOf("Detergente");
    expect(
      within(row).getByRole("cell", { name: "21/09/2026 · 11:00" }),
    ).toHaveAttribute("data-label", "Fecha");
  });
});
