import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  alcohol,
  branchSuppliesHandler,
  detergent,
  paper,
  suppliesPath,
  supplyPage,
} from "../../test/back-office-fixtures";
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

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type Sent = { key: string | null; body: unknown };

let stock = 12;
const detergentNow = () => ({ ...detergent, quantityOnHand: stock });
let listReads = 0;
// The panels' Insumo list and the badge (one page of 100), and the table.
const supplyReads = () => [
  http.get(apiUrl(suppliesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("pageSize") !== "100") return undefined;
    listReads += 1;
    return jsonResponse(
      supplyPage([alcohol, detergentNow(), paper], { pageSize: 100 }),
    );
  }),
  http.get(apiUrl(suppliesPath), () =>
    jsonResponse(supplyPage([alcohol, detergentNow(), paper])),
  ),
];

const movement = (
  path: "withdrawals" | "restocks",
  sent: Sent[],
  answer: (body: { quantity: number }) => Response,
) =>
  http.post(
    apiUrl(`${suppliesPath}/${detergent.id}/${path}`),
    async ({ request }) => {
      const body = (await request.json()) as { quantity: number };
      sent.push({ key: request.headers.get("idempotency-key"), body });
      return answer(body);
    },
  );

const openPanel = async (
  action: "Registrar retiro" | "Registrar reposición",
) => {
  const rendered = renderAdmin("/back-office/insumos");
  await screen.findByRole("cell", { name: "Detergente" });
  await rendered.user.click(screen.getByRole("button", { name: action }));
  const panel = await screen.findByRole("dialog", { name: action });
  return { ...rendered, panel };
};

const quantityField = (panel: HTMLElement, label: string) =>
  within(panel).getByLabelText(label);

describe("AW10 Registrar retiro on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    stock = 12;
    listReads = 0;
    server.use(...signedInHandlers());
    server.use(...supplyReads());
  });

  it("lists the Branch's Supplies with their stock and refuses more than the stock", async () => {
    const { panel, user } = await openPanel("Registrar retiro");
    const supply = within(panel).getByLabelText("Insumo");
    expect(
      within(supply)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Elige un insumo",
      "Alcohol en gel (3 unid.)",
      "Detergente (12 unid.)",
      "Papel higiénico (2 unid.)",
    ]);

    await user.click(within(panel).getByRole("button", { name: "Registrar" }));
    expect(supply).toHaveAccessibleDescription("Elige un insumo.");

    await user.selectOptions(supply, detergent.id);
    const quantity = quantityField(panel, "Cantidad retirada");
    expect(quantity).toHaveAccessibleDescription("Máximo: 12 unid.");
    await user.type(quantity, "13");
    expect(quantity).toHaveAccessibleDescription(
      "Máximo: 12 unid. Solo hay 12 unid. en stock.",
    );
    expect(
      within(panel).getByRole("button", { name: "Registrar" }),
    ).toBeDisabled();
  });

  it("records a Withdrawal with an Idempotency-Key and refreshes the stock", async () => {
    const sent: Sent[] = [];
    server.use(
      movement("withdrawals", sent, ({ quantity }) => {
        stock -= quantity;
        return jsonResponse(
          {
            id: "6a000000-0000-5000-8000-000000000001",
            supplyId: detergent.id,
            quantity,
            recordedAt: "2026-09-24T15:00:00.000Z",
            quantityOnHand: stock,
          },
          201,
        );
      }),
    );
    const { panel, user } = await openPanel("Registrar retiro");
    await user.selectOptions(
      within(panel).getByLabelText("Insumo"),
      detergent.id,
    );
    await user.type(quantityField(panel, "Cantidad retirada"), "3");
    const readsBefore = listReads;
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));

    expect(
      await screen.findByText(
        "Retiro registrado: quedan 9 unid. de Detergente.",
      ),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      { key: expect.stringMatching(uuid), body: { quantity: 3 } },
    ]);
    expect(await screen.findByRole("cell", { name: "9" })).toBeVisible();
    expect(listReads).toBeGreaterThan(readsBefore);
  });

  it("retries a lost answer with the same key and a changed quantity with a new one", async () => {
    const sent: Sent[] = [];
    server.use(movement("withdrawals", sent, () => HttpResponse.error()));
    const { panel, user } = await openPanel("Registrar retiro");
    await user.selectOptions(
      within(panel).getByLabelText("Insumo"),
      detergent.id,
    );
    await user.type(quantityField(panel, "Cantidad retirada"), "2");
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));
    expect(
      await within(panel).findByText("No pudimos guardar. Inténtalo de nuevo."),
    ).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));
    await waitFor(() => expect(sent).toHaveLength(2));
    await user.clear(quantityField(panel, "Cantidad retirada"));
    await user.type(quantityField(panel, "Cantidad retirada"), "1");
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));
    await waitFor(() => expect(sent).toHaveLength(3));

    expect(sent[1]?.key).toBe(sent[0]?.key);
    expect(sent[2]?.key).toMatch(uuid);
    expect(sent[2]?.key).not.toBe(sent[0]?.key);
  });

  it("shows the fresh stock when someone withdrew first", async () => {
    server.use(
      movement("withdrawals", [], () => {
        stock = 4;
        return problemResponse(409, "insufficient_stock");
      }),
    );
    const { panel, user } = await openPanel("Registrar retiro");
    await user.selectOptions(
      within(panel).getByLabelText("Insumo"),
      detergent.id,
    );
    await user.type(quantityField(panel, "Cantidad retirada"), "10");
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));

    await waitFor(() =>
      expect(
        quantityField(panel, "Cantidad retirada"),
      ).toHaveAccessibleDescription(
        "Máximo: 4 unid. Solo hay 4 unid. en stock.",
      ),
    );
    expect(
      within(within(panel).getByLabelText("Insumo")).getByRole("option", {
        name: "Detergente (4 unid.)",
      }),
    ).toBeInTheDocument();
  });

  it("explains a Supply archived while the panel was open", async () => {
    server.use(
      movement("withdrawals", [], () =>
        problemResponse(409, "supply_archived"),
      ),
    );
    const { panel, user } = await openPanel("Registrar retiro");
    await user.selectOptions(
      within(panel).getByLabelText("Insumo"),
      detergent.id,
    );
    await user.type(quantityField(panel, "Cantidad retirada"), "1");
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));

    expect(
      await within(panel).findByText(
        "Este insumo ya está archivado. Cierra el panel para ver la lista actual.",
      ),
    ).toBeInTheDocument();
  });
});

describe("Registrar reposición on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    stock = 12;
    server.use(...signedInHandlers());
    server.use(...supplyReads());
  });

  it("adds units without a maximum and says the new stock", async () => {
    const sent: Sent[] = [];
    server.use(
      movement("restocks", sent, ({ quantity }) => {
        stock += quantity;
        return jsonResponse(
          {
            id: "6b000000-0000-5000-8000-000000000001",
            supplyId: detergent.id,
            quantity,
            recordedAt: "2026-09-24T15:00:00.000Z",
            quantityOnHand: stock,
          },
          201,
        );
      }),
    );
    const { panel, user } = await openPanel("Registrar reposición");
    await user.selectOptions(
      within(panel).getByLabelText("Insumo"),
      detergent.id,
    );
    const quantity = quantityField(panel, "Cantidad repuesta");
    expect(quantity).not.toHaveAccessibleDescription(/Máximo/);
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));
    expect(quantity).toHaveAccessibleDescription(
      "Escribe un número entero desde 1.",
    );
    await user.type(quantity, "30");
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));

    expect(
      await screen.findByText(
        "Reposición registrada: ahora hay 42 unid. de Detergente.",
      ),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      { key: expect.stringMatching(uuid), body: { quantity: 30 } },
    ]);
  });
});

describe("Supply movements on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("fills the screen and says when the Branch has nothing to withdraw", async () => {
    server.use(
      branchSuppliesHandler([]),
      http.get(apiUrl(suppliesPath), () =>
        jsonResponse(supplyPage([detergent])),
      ),
    );
    const { panel } = await openPanel("Registrar retiro");
    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    expect(
      within(panel).getByText("No hay insumos en esta sucursal."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Registrar" }),
    ).toBeDisabled();
  });
});
