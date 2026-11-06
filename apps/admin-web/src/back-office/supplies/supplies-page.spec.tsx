import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  alcohol,
  branchSuppliesHandler,
  detergent,
  paper,
  suppliesPath,
  supplyPage,
  supplyRow,
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
import { expectBrandedLoading } from "../../test/branded-loading";

const reads: URLSearchParams[] = [];
// The table's own read; the badge and panel list (100 rows) fall through.
const supplyTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(suppliesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("pageSize") === "100") return undefined;
    reads.push(params);
    return respond(params);
  });

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Insumos" });
const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name })).parentElement as HTMLElement;

describe("AW08 Insumos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists the selected Branch's Supplies with their stock and the low-stock badge", async () => {
    server.use(
      supplyTable(() => jsonResponse(supplyPage([alcohol, detergent, paper]))),
    );
    renderAdmin("/estudio/insumos");
    await heading();

    expectBrandedLoading("Cargando insumos…");
    const paperRow = await rowOf("Papel higiénico");
    const stock = within(paperRow).getByRole("cell", { name: "2" });
    expect(stock).toHaveAttribute("data-label", "Cantidad en stock");
    expect(stock).toHaveClass("md:text-right");
    expect(within(paperRow).getByText("Stock bajo")).toBeInTheDocument();
    expect(
      within(await rowOf("Alcohol en gel")).getByText("Stock bajo"),
    ).toBeInTheDocument();
    expect(
      within(await rowOf("Detergente")).queryByText("Stock bajo"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Sucursal Centro · 2 con stock bajo"),
    ).toBeVisible();
    expect(screen.getByText("Mostrando 1–3 de 3 insumos")).toBeVisible();
    expect(reads[0]?.get("branchId")).toBe(centro.id);
    expect(reads[0]?.get("status")).toBe("active");
    expect(reads[0]?.get("page")).toBe("1");
  });

  it("offers the four header actions of follow-ups 07 and 48", async () => {
    server.use(supplyTable(() => jsonResponse(supplyPage([detergent]))));
    renderAdmin("/estudio/insumos");
    await rowOf("Detergente");

    const actions = screen
      .getAllByRole("button")
      .concat(screen.getAllByRole("link", { name: /historial/ }))
      .map((element) => element.textContent)
      .filter((label) =>
        [
          "Nuevo insumo",
          "Registrar retiro",
          "Registrar reposición",
          "Ver historial de retiros",
        ].includes(label ?? ""),
      );
    // Follow-up 233: the one primary action sits last among the buttons.
    expect(actions).toEqual([
      "Registrar retiro",
      "Registrar reposición",
      "Nuevo insumo",
      "Ver historial de retiros",
    ]);
    expect(
      screen.getByRole("link", { name: "Ver historial de retiros" }),
    ).toHaveAttribute("href", "/estudio/insumos/retiros?page=1&pageSize=20");
    expect(screen.getByText("Sucursal Centro · ningún insumo con stock bajo"));
  });

  it("follows the Branch selector and keeps the page in the address", async () => {
    server.use(
      supplyTable((params) =>
        jsonResponse(
          params.get("branchId") === equipetrol.id
            ? supplyPage([
                supplyRow("09", "Toallas", { branchId: equipetrol.id }),
              ])
            : supplyPage([detergent], {
                page: Number(params.get("page")),
                totalItems: 21,
              }),
        ),
      ),
    );
    const { user } = renderAdmin("/estudio/insumos?page=2");
    await rowOf("Detergente");
    expect(reads.at(-1)?.get("page")).toBe("2");

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );

    expect(await rowOf("Toallas")).toBeVisible();
    expect(screen.queryByRole("cell", { name: "Detergente" })).toBeNull();
    expect(screen.getByText(/^Sucursal Equipetrol ·/)).toBeVisible();
    expect(reads.at(-1)?.get("branchId")).toBe(equipetrol.id);
  });

  it("says when the Branch has no Supplies yet", async () => {
    server.use(supplyTable(() => jsonResponse(supplyPage([]))));
    renderAdmin("/estudio/insumos");
    expect(
      await screen.findByText("Todavía no hay insumos en esta sucursal."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Crea el primero con «Nuevo insumo»."),
    ).toBeVisible();
  });

  it("offers a retry when the Supplies cannot load", async () => {
    server.use(supplyTable(() => problemResponse(500, "unexpected_error")));
    renderAdmin("/estudio/insumos");
    expect(
      await screen.findByText(
        "No pudimos cargar los insumos.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("hides every action from someone who lost access", async () => {
    server.use(
      supplyTable(() => problemResponse(403, "back_office_access_denied")),
    );
    renderAdmin("/estudio/insumos");
    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    for (const name of [
      "Nuevo insumo",
      "Registrar retiro",
      "Registrar reposición",
    ]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});

describe("Insumos sidebar badge", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("counts the selected Branch's low-stock Supplies on Estudio from every page", async () => {
    server.use(
      branchSuppliesHandler([alcohol, detergent, paper], centro.id),
      branchSuppliesHandler([], equipetrol.id),
    );
    const { user } = renderAdmin("/horario");
    await screen.findByRole("heading", { level: 1, name: "Horario" });

    // Follow-up 232: the count rides on Estudio in the rail.
    const link = await screen.findByRole("link", {
      name: "Estudio, 2 con stock bajo",
    });
    expect(within(link).getByText("2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );
    expect(
      await screen.findByRole("link", { name: "Estudio" }),
    ).not.toHaveTextContent(/\d/);
  });
});

describe("AW08 Insumos on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("labels each card's cells and shows the badge in the drawer", async () => {
    server.use(
      branchSuppliesHandler([paper]),
      supplyTable(() => jsonResponse(supplyPage([paper]))),
    );
    const { user } = renderAdmin("/estudio/insumos");
    const row = await rowOf("Papel higiénico");
    expect(within(row).getByText("Stock bajo").closest("td")).toHaveAttribute(
      "data-label",
      "Estado",
    );

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(
      await screen.findByRole("link", { name: "Estudio, 1 con stock bajo" }),
    ).toBeInTheDocument();
  });
});
