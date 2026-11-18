import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  everySupplyHandler,
  paper,
  withdrawalPage,
  withdrawalRow,
  withdrawalsPath,
} from "../../test/back-office-fixtures";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { compactCard } from "../../test/compact-card";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const reads: URLSearchParams[] = [];
const history = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(withdrawalsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

// 16 out at 10:00 by Paola, 20 back at 15:00 by Carolina, in Bolivia.
const restock = withdrawalRow("02", paper, 20, "2026-11-18T19:00:00.000Z", {
  kind: "restock",
  recordedByName: "Carolina Rivas",
});
const withdrawal = withdrawalRow("01", paper, 16, "2026-11-18T14:00:00.000Z");
const november = withdrawalPage([restock, withdrawal], {
  month: "2026-11",
  totals: [{ supplyId: paper.id, supplyName: "Papel higiénico", quantity: 16 }],
});
const byKind = (params: URLSearchParams) =>
  params.get("kind") === "restock"
    ? withdrawalPage([restock], { month: "2026-11", totals: november.totals })
    : params.get("kind") === "withdrawal"
      ? withdrawalPage([], { month: "2026-11" })
      : november;

const rowAt = async (date: string) =>
  (await screen.findByRole("cell", { name: date }))
    .parentElement as HTMLElement;

// Walkthrough finding 102: who recorded each movement, and the Restocks.
describe("AW31 Movimientos de insumos by kind", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers(), everySupplyHandler());
  });

  it("shows Withdrawals and Restocks together with who recorded each", async () => {
    server.use(history((params) => jsonResponse(byKind(params))));
    renderAdmin("/estudio/insumos/retiros?month=2026-11");

    const restockRow = await rowAt("18/11/2026 · 15:00");
    expect(
      within(restockRow).getByRole("cell", { name: "Reposición" }),
    ).toHaveAttribute("data-label", "Movimiento");
    expect(
      within(restockRow).getByRole("cell", { name: "Carolina Rivas" }),
    ).toHaveAttribute("data-label", "Registró");
    const withdrawalRowElement = await rowAt("18/11/2026 · 10:00");
    expect(
      within(withdrawalRowElement).getByRole("cell", { name: "Retiro" }),
    ).toBeInTheDocument();
    expect(
      within(withdrawalRowElement).getByRole("cell", { name: "Paola Mendoza" }),
    ).toBeInTheDocument();
    expect(reads[0]?.get("kind")).toBe("all");
    expect(
      screen.getByText("2 movimientos en noviembre de 2026."),
    ).toBeVisible();
    // The consumption report still counts Withdrawals only.
    expect(screen.getByText("Papel higiénico: 16 unid.")).toBeVisible();
    // Insumos' second view is named after what it now lists.
    expect(
      screen.getByRole("link", { name: "Movimientos", current: "page" }),
    ).toHaveAttribute("href", "/estudio/insumos/retiros");
    expect(screen.queryByText("Retiros del mes")).not.toBeInTheDocument();
  });

  it("filters by kind in the address and names the kind in the summary", async () => {
    server.use(history((params) => jsonResponse(byKind(params))));
    const { router, user } = renderAdmin(
      "/estudio/insumos/retiros?month=2026-11",
    );
    await rowAt("18/11/2026 · 15:00");

    const filter = screen.getByLabelText("Movimiento");
    expect(
      within(filter)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Todos", "Retiros", "Reposiciones"]);
    await user.selectOptions(filter, "restock");

    expect(
      await screen.findByText("1 reposición en noviembre de 2026."),
    ).toBeVisible();
    expect(screen.getByText("Mostrando 1–1 de 1 reposición")).toBeVisible();
    expect(reads.at(-1)?.get("kind")).toBe("restock");
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      kind: "restock",
      page: 1,
    });

    await user.selectOptions(filter, "withdrawal");
    expect(await screen.findByText("Sin retiros en este rango.")).toBeVisible();
  });
});

describe("AW31 Movimientos de insumos on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(
      ...signedInHandlers(),
      everySupplyHandler(),
      history((params) => jsonResponse(byKind(params))),
    );
  });

  it("labels who recorded each card", async () => {
    renderAdmin("/estudio/insumos/retiros?month=2026-11");
    // FIX-088: the phone card leaves out who recorded it.
    const row = (await screen.findByText("18/11/2026 · 10:00")).closest("tr")!;
    expect(compactCard(row)).toMatchObject({ compact: true, labels: 0 });
    expect(row).not.toHaveTextContent("Paola Mendoza");
  });
});
