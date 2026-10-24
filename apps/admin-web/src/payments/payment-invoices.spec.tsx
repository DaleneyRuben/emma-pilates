import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  paymentPage,
  paymentRow,
  paymentsPath,
  pendingBadgeHandler,
  sofiaPayment,
} from "../test/payment-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const ana = { taxId: "4567891", name: "Ana María Pérez" };
const unbilledCash = paymentRow("21", "Ana Pérez", {
  method: "cash",
  state: "confirmed",
  decidedAt: "2026-10-22T14:00:00.000Z",
  invoiceData: ana,
});
const issuedTransfer = paymentRow("22", "Valeria Quiroga", {
  state: "confirmed",
  decidedAt: "2026-10-21T14:00:00.000Z",
  invoiceData: { taxId: "1020304050", name: "Estudio Valeria SRL" },
  invoiceIssued: {
    issuedAt: "2026-10-23T15:00:00.000Z",
    issuedByName: "Paola Mendoza",
  },
});
const plainCash = paymentRow("23", "Isabel Arce", {
  method: "cash",
  state: "confirmed",
  decidedAt: "2026-10-20T14:00:00.000Z",
});
const pendingWithData = paymentRow("24", "Sofía Guzmán", { invoiceData: ana });

const reads: URLSearchParams[] = [];
const paymentTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(paymentsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("pageSize") === "1") return undefined;
    reads.push(params);
    return respond(params);
  });

const rowOf = async (name: RegExp) =>
  (await screen.findByRole("cell", { name })).parentElement as HTMLElement;
const invoiceCell = (row: HTMLElement) =>
  within(row).getByRole("cell", {
    name: (_name, element) => element.getAttribute("data-label") === "Factura",
  });

const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });

// PAY-007, design follow-up 147: AW28 lists every sale for the accountant.
describe("AW28 Pagos invoices", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
    server.use(pendingBadgeHandler(1));
  });

  it("shows the method and the invoice data of every sale", async () => {
    server.use(
      paymentTable(() =>
        jsonResponse(
          paymentPage([
            pendingWithData,
            unbilledCash,
            issuedTransfer,
            plainCash,
          ]),
        ),
      ),
    );
    renderAdmin("/back-office/pagos?status=all");

    const pending = await rowOf(/Sofía Guzmán/);
    expect(
      within(pending).getByRole("cell", { name: "Transferencia" }),
    ).toBeVisible();
    expect(within(invoiceCell(pending)).getByText("4567891")).toBeVisible();
    expect(
      within(pending).queryByRole("button", { name: /Marcar emitida/ }),
    ).not.toBeInTheDocument();

    const cash = await rowOf(/Ana Pérez/);
    expect(within(cash).getByRole("cell", { name: "Efectivo" })).toBeVisible();
    expect(
      within(cash).getByRole("button", { name: "Marcar emitida: Ana Pérez" }),
    ).toBeVisible();

    const issued = await rowOf(/Valeria Quiroga/);
    expect(within(invoiceCell(issued)).getByText("Emitida")).toBeVisible();
    expect(
      within(issued).getByText("por Paola Mendoza · 23/10/2026"),
    ).toBeVisible();
    expect(
      within(issued).getByRole("button", { name: "Deshacer: Valeria Quiroga" }),
    ).toBeVisible();

    const plain = await rowOf(/Isabel Arce/);
    expect(within(invoiceCell(plain)).getByText("Sin factura")).toBeVisible();
  });

  it("filters the sales still unbilled and keeps the filter in the address", async () => {
    server.use(
      paymentTable((params) =>
        jsonResponse(
          paymentPage(
            params.get("invoice") === "unissued"
              ? [unbilledCash]
              : [sofiaPayment],
          ),
        ),
      ),
    );
    const { router, user } = renderAdmin("/back-office/pagos");
    await rowOf(/Sofía Guzmán/);

    await user.selectOptions(
      screen.getByLabelText("Factura"),
      "Sin factura emitida",
    );

    expect(await rowOf(/Ana Pérez/)).toBeInTheDocument();
    expect(reads.at(-1)?.get("invoice")).toBe("unissued");
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      invoice: "unissued",
      page: 1,
    });
  });

  it("says when no sale is waiting for its invoice", async () => {
    server.use(paymentTable(() => jsonResponse(paymentPage([]))));
    renderAdmin("/back-office/pagos?status=all&invoice=unissued");

    const table = await screen.findByRole("table");
    expect(
      await within(table).findByText("No hay facturas pendientes."),
    ).toBeInTheDocument();
  });

  it("marks an invoice issued and undoes it, then reads the list again", async () => {
    const calls: string[] = [];
    let issued = false;
    server.use(
      paymentTable(() =>
        jsonResponse(
          paymentPage([
            issued
              ? {
                  ...unbilledCash,
                  invoiceIssued: {
                    issuedAt: "2026-10-23T15:00:00.000Z",
                    issuedByName: "Paola Mendoza",
                  },
                }
              : unbilledCash,
          ]),
        ),
      ),
      http.post(
        apiUrl(`${paymentsPath}/${unbilledCash.id}/invoice-issued`),
        () => {
          calls.push("mark");
          issued = true;
          return jsonResponse({
            paymentId: unbilledCash.id,
            invoiceIssued: null,
          });
        },
      ),
      http.delete(
        apiUrl(`${paymentsPath}/${unbilledCash.id}/invoice-issued`),
        () => {
          calls.push("unmark");
          issued = false;
          return jsonResponse({
            paymentId: unbilledCash.id,
            invoiceIssued: null,
          });
        },
      ),
    );
    const { user } = renderAdmin("/back-office/pagos?status=all");
    await rowOf(/Ana Pérez/);

    await user.click(
      screen.getByRole("button", { name: "Marcar emitida: Ana Pérez" }),
    );
    expect(
      await screen.findByText("por Paola Mendoza · 23/10/2026"),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Deshacer: Ana Pérez" }),
    );
    expect(
      await screen.findByRole("button", { name: "Marcar emitida: Ana Pérez" }),
    ).toBeVisible();
    expect(calls).toEqual(["mark", "unmark"]);
  });

  it("says so when the mark cannot be saved", async () => {
    server.use(
      paymentTable(() => jsonResponse(paymentPage([unbilledCash]))),
      http.post(
        apiUrl(`${paymentsPath}/${unbilledCash.id}/invoice-issued`),
        () => problemResponse(409, "payment_not_confirmed"),
      ),
    );
    const { user } = renderAdmin("/back-office/pagos?status=all");
    await rowOf(/Ana Pérez/);

    await user.click(
      screen.getByRole("button", { name: "Marcar emitida: Ana Pérez" }),
    );

    expect(
      await screen.findByText(
        "No pudimos guardar la marca de factura. Inténtalo de nuevo.",
      ),
    ).toBeVisible();
  });

  describe("Exportar CSV", () => {
    let saved: { name: string; blob: Blob } | undefined;
    let createObjectURL: typeof URL.createObjectURL;
    let click: jest.SpyInstance;

    beforeEach(() => {
      saved = undefined;
      createObjectURL = URL.createObjectURL;
      let blob: Blob | undefined;
      URL.createObjectURL = (value: Blob | MediaSource) => {
        blob = value as Blob;
        return "blob:test/pagos";
      };
      click = jest
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(function (this: HTMLAnchorElement) {
          if (blob !== undefined) saved = { name: this.download, blob };
        });
    });

    afterEach(() => {
      URL.createObjectURL = createObjectURL;
      click.mockRestore();
    });

    it("downloads every page of the filtered sales", async () => {
      server.use(
        paymentTable((params) =>
          jsonResponse(
            params.get("pageSize") === "100"
              ? paymentPage(
                  params.get("page") === "1"
                    ? [unbilledCash]
                    : [issuedTransfer],
                  {
                    page: Number(params.get("page")),
                    pageSize: 100,
                    totalItems: 101,
                  },
                )
              : paymentPage([unbilledCash], { totalItems: 2 }),
          ),
        ),
      );
      const { user } = renderAdmin(
        "/back-office/pagos?status=confirmed&invoice=unissued",
      );
      await rowOf(/Ana Pérez/);

      await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

      await waitFor(() => expect(saved).toBeDefined());
      expect(saved?.name).toMatch(/^pagos-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(saved?.blob.type).toBe("text/csv;charset=utf-8");
      const exports = reads.filter(
        (params) => params.get("pageSize") === "100",
      );
      expect(exports.map((params) => params.get("page"))).toEqual(["1", "2"]);
      expect(
        exports.every(
          (params) =>
            params.get("status") === "confirmed" &&
            params.get("invoice") === "unissued",
        ),
      ).toBe(true);
      const text = saved === undefined ? "" : await readBlob(saved.blob);
      expect(text.split("\r\n")).toHaveLength(4);
      expect(text).toContain("Estudio Valeria SRL");
    });
  });
});
