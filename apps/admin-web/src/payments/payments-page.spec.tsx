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
  luciaPayment,
  marianaPayment,
  paymentPage,
  paymentsPath,
  pendingBadgeHandler,
  sofiaPayment,
  valeriaPayment,
} from "../test/payment-fixtures";
import { emptyPageHandlers } from "../test/page-handlers";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const reads: URLSearchParams[] = [];
// The sidebar badge's one-row read falls through to its own handler.
const paymentTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(paymentsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("pageSize") === "1") return undefined;
    reads.push(params);
    return respond(params);
  });

const heading = () => screen.findByRole("heading", { level: 1, name: "Pagos" });
const rowOf = async (name: RegExp) =>
  (await screen.findByRole("cell", { name })).parentElement as HTMLElement;

describe("AW28 Pagos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
    server.use(pendingBadgeHandler(6));
  });

  it("lists the pending transfers first by default with the studio count", async () => {
    server.use(
      paymentTable(() =>
        jsonResponse(paymentPage([luciaPayment, sofiaPayment])),
      ),
    );
    renderAdmin("/back-office/pagos");
    await heading();

    expect(screen.getByText("Cargando pagos…")).toBeInTheDocument();
    const sofia = await rowOf(/Sofía Guzmán/);
    const amount = within(sofia).getByRole("cell", { name: /Bs 500,00/ });
    expect(amount).toHaveAttribute("data-label", "Monto");
    expect(amount).toHaveClass("md:text-right");
    // Credit is retired (PAY-005): an older Payment's Credit is not shown.
    expect(within(amount).queryByText(/de crédito/)).not.toBeInTheDocument();
    expect(
      within(sofia).getByRole("cell", { name: "Paquete de 8 clases" }),
    ).toBeInTheDocument();
    expect(
      within(sofia).getByRole("cell", { name: "21/09/2026 · 14:05" }),
    ).toBeInTheDocument();
    expect(within(sofia).getByText("Pendiente")).toBeInTheDocument();
    const lucia = await rowOf(/Lucía Fernández/);
    expect(within(lucia).getByText("Bs 1.050,00")).toBeInTheDocument();
    expect(within(lucia).queryByText(/de crédito/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Todo el estudio · 6 transferencias esperando revisión"),
    ).toBeVisible();
    expect(screen.getByText("Mostrando 2 de 2 pagos pendientes")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Nuevo/ }),
    ).not.toBeInTheDocument();
    expect(reads[0]?.get("status")).toBe("pending");
    expect(reads[0]?.get("page")).toBe("1");
    expect(reads[0]?.has("q")).toBe(false);
  });

  it("shows every state from the Estado filter and keeps it in the address", async () => {
    server.use(
      paymentTable((params) =>
        jsonResponse(
          params.get("status") === "all"
            ? paymentPage([sofiaPayment, marianaPayment, valeriaPayment])
            : paymentPage([sofiaPayment]),
        ),
      ),
    );
    const { router, user } = renderAdmin("/back-office/pagos");
    await rowOf(/Sofía Guzmán/);

    await user.selectOptions(screen.getByLabelText("Estado"), "Todos");

    expect(
      within(await rowOf(/Valeria Quiroga/)).getByText("Confirmado"),
    ).toBeInTheDocument();
    expect(
      within(await rowOf(/Mariana Paz/)).getByText("Rechazado"),
    ).toBeInTheDocument();
    expect(screen.getByText("Mostrando 3 de 3 pagos")).toBeVisible();
    expect(reads.at(-1)?.get("status")).toBe("all");
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      status: "all",
    });
  });

  it("sends the Client search and puts it in the address", async () => {
    server.use(
      paymentTable((params) =>
        jsonResponse(
          params.get("q") === "sofia"
            ? paymentPage([sofiaPayment])
            : paymentPage([luciaPayment, sofiaPayment]),
        ),
      ),
    );
    const { router, user } = renderAdmin("/back-office/pagos?page=2");
    await rowOf(/Lucía Fernández/);

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar por cliente" }),
      "sofia",
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: /Lucía Fernández/ }),
      ).not.toBeInTheDocument(),
    );
    expect(reads.at(-1)?.get("q")).toBe("sofia");
    expect(reads.at(-1)?.get("page")).toBe("1");
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      q: "sofia",
      page: 1,
    });
  });

  it("opens only pending rows; a settled row is the whole record", async () => {
    server.use(
      paymentTable(() =>
        jsonResponse(paymentPage([sofiaPayment, valeriaPayment])),
      ),
      http.get(apiUrl(`${paymentsPath}/:paymentId`), () =>
        problemResponse(500, "unexpected_error"),
      ),
    );
    const { user } = renderAdmin("/back-office/pagos?status=all");

    await user.click(await rowOf(/Valeria Quiroga/));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Valeria Quiroga" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sofía Guzmán" }));
    expect(
      await screen.findByRole("dialog", { name: "Revisar pago" }),
    ).toBeInTheDocument();
  });

  it("says when nothing is waiting for review", async () => {
    server.use(
      paymentTable(() => jsonResponse(paymentPage([], { pendingCount: 0 }))),
    );
    renderAdmin("/back-office/pagos");

    const table = await screen.findByRole("table");
    expect(
      await within(table).findByText("No hay pagos pendientes."),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(
        "Todo al día. Cuando una clienta envíe un comprobante, aparece aquí.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Todo el estudio · ninguna transferencia por revisar"),
    ).toBeVisible();
  });

  it("says a search found no Payment and keeps the table header", async () => {
    server.use(paymentTable(() => jsonResponse(paymentPage([]))));
    renderAdmin("/back-office/pagos?q=rodrigues&status=all");

    const table = await screen.findByRole("table");
    expect(
      await within(table).findByText("No se encontró ningún pago."),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(
        "Revisa cómo escribiste el nombre de la clienta.",
      ),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Estado" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("offers a retry when the list cannot load", async () => {
    let failing = true;
    server.use(
      paymentTable(() =>
        failing
          ? problemResponse(500, "unexpected_error")
          : jsonResponse(paymentPage([sofiaPayment])),
      ),
    );
    const { user } = renderAdmin("/back-office/pagos");

    expect(
      await screen.findByText(
        "No pudimos cargar los pagos.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await rowOf(/Sofía Guzmán/)).toBeInTheDocument();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      paymentTable(() => problemResponse(403, "administration_access_denied")),
    );
    renderAdmin("/back-office/pagos");

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
  });

  it("counts the pending transfers next to Pagos in the sidebar", async () => {
    server.use(
      paymentTable(() => jsonResponse(paymentPage([sofiaPayment]))),
      ...emptyPageHandlers(),
    );
    renderAdmin("/back-office/clientes");

    expect(
      await screen.findByRole("link", { name: "Pagos, 6 por revisar" }),
    ).toBeInTheDocument();
  });
});

describe("AW28 Pagos without pending transfers in the sidebar", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(pendingBadgeHandler(0));
  });

  it("shows no badge when nothing waits", async () => {
    server.use(paymentTable(() => jsonResponse(paymentPage([]))));
    renderAdmin("/back-office/pagos");
    await heading();

    expect(screen.getByRole("link", { name: /^Pagos$/ })).toBeInTheDocument();
  });
});

describe("AW28 Pagos on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(pendingBadgeHandler(6));
  });

  it("keeps the filters above one labelled card per Payment", async () => {
    server.use(paymentTable(() => jsonResponse(paymentPage([sofiaPayment]))));
    renderAdmin("/back-office/pagos");

    const plan = await screen.findByRole("cell", {
      name: "Paquete de 8 clases",
    });
    expect(plan).toHaveAttribute("data-label", "Plan");
    expect(
      screen.getByRole("searchbox", { name: "Buscar por cliente" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Estado")).toHaveValue("pending");
  });
});
