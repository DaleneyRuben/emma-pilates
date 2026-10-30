import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { centro } from "../../test/booking-handlers";
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

const cashClosesPath = "/api/v1/administrator/cash-closes";
const reads: URLSearchParams[] = [];
const history = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(cashClosesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const close = (
  businessDate: string,
  values: {
    expectedCentavos: number;
    countedCentavos: number;
    adjustmentCentavos?: number;
    note?: string | null;
  },
) => ({
  id: `close-${businessDate}`,
  branchId: centro.id,
  businessDate,
  expectedCentavos: values.expectedCentavos,
  cashPaymentCount: 3,
  countedCentavos: values.countedCentavos,
  differenceCentavos: values.countedCentavos - values.expectedCentavos,
  note: values.note ?? null,
  // 19:05 in Bolivia.
  closedAt: `${businessDate}T23:05:00.000Z`,
  closedByName: "Camila Rojas",
  adjustmentCentavos: values.adjustmentCentavos ?? 0,
});

const october = {
  branchId: centro.id,
  month: "2026-10",
  missingDays: 1,
  days: [
    {
      businessDate: "2026-10-24",
      status: "open",
      cashSalesCentavos: 15_000,
      cashPaymentCount: 1,
      close: null,
    },
    {
      businessDate: "2026-10-23",
      status: "closed",
      cashSalesCentavos: 52_000,
      cashPaymentCount: 3,
      close: close("2026-10-23", {
        expectedCentavos: 52_000,
        countedCentavos: 51_000,
        note: "Faltó cambio para un billete de 200",
      }),
    },
    {
      businessDate: "2026-10-22",
      status: "missing",
      cashSalesCentavos: 30_000,
      cashPaymentCount: 2,
      close: null,
    },
    {
      businessDate: "2026-10-21",
      status: "closed",
      cashSalesCentavos: 51_000,
      cashPaymentCount: 3,
      close: close("2026-10-21", {
        expectedCentavos: 76_000,
        countedCentavos: 76_000,
        adjustmentCentavos: -25_000,
      }),
    },
    {
      businessDate: "2026-10-20",
      status: "closed",
      cashSalesCentavos: 25_000,
      cashPaymentCount: 1,
      close: close("2026-10-20", {
        expectedCentavos: 25_000,
        countedCentavos: 25_500,
        note: "Sobró una moneda de 5",
      }),
    },
  ],
};

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Cierres de caja" });
const rowOf = async (date: string) =>
  (await screen.findByRole("cell", { name: date }))
    .parentElement as HTMLElement;

describe("AW151 Cierres de caja on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("opens on the current Bolivia month of the selected Branch under «Caja»", async () => {
    server.use(
      history(() =>
        jsonResponse({
          ...october,
          month: boliviaMonth(),
          missingDays: 0,
          days: [],
        }),
      ),
    );
    renderAdmin("/back-office/caja");
    await heading();

    expect(
      await screen.findByText(
        "No hubo ventas en efectivo ni cierres en este mes.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Prueba con otro mes o con otra sucursal."),
    ).toBeVisible();
    expect(screen.getByText(formatMonth(boliviaMonth()))).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Mes siguiente" }),
    ).toBeDisabled();
    expect(screen.getByText(`Sucursal ${centro.name}`)).toBeVisible();
    expect(reads[0]?.get("month")).toBe(boliviaMonth());
    expect(reads[0]?.get("branchId")).toBe(centro.id);
    expect(screen.getByRole("link", { name: "Caja" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("button", { name: /Nuevo|Registrar|Cerrar/ }),
    ).toBeNull();
  });

  it("names the voided cash sales still in the day's expected cash (FIX-004)", async () => {
    server.use(
      history(() =>
        jsonResponse({
          ...october,
          missingDays: 0,
          days: [
            {
              businessDate: "2026-10-23",
              status: "closed",
              cashSalesCentavos: 52_000,
              cashPaymentCount: 3,
              voidedCashCentavos: 29_000,
              close: close("2026-10-23", {
                expectedCentavos: 52_000,
                countedCentavos: 52_000,
              }),
            },
          ],
        }),
      ),
    );
    renderAdmin("/back-office/caja?month=2026-10");

    const day = await rowOf("vie 23/10");
    expect(
      within(day).getByText("Ventas anuladas (efectivo en caja): Bs 290,00"),
    ).toBeVisible();
  });

  it("lists the month's days with their status, highlighting differences and flagging days left unclosed", async () => {
    server.use(history(() => jsonResponse(october)));
    renderAdmin("/back-office/caja?month=2026-10");

    expect(
      await screen.findByText("1 día con ventas en efectivo sin cierre"),
    ).toBeVisible();
    expect(
      screen.getByText("Revisa con recepción qué pasó esos días."),
    ).toBeVisible();

    const short = await rowOf("vie 23/10");
    expect(within(short).getByText("Cerrada")).toBeVisible();
    expect(
      within(short).getByRole("cell", { name: "Bs 520,00" }),
    ).toBeVisible();
    expect(
      within(short).getByRole("cell", { name: "Bs 510,00" }),
    ).toBeVisible();
    expect(within(short).getByText("−Bs 10,00")).toHaveClass(
      "text-error-texto",
    );
    expect(short).toHaveAttribute("data-difference", "short");
    expect(within(short).getByText("Camila Rojas · 19:05")).toBeVisible();
    expect(
      within(short).getByText("Faltó cambio para un billete de 200"),
    ).toBeVisible();

    const missing = await rowOf("jue 22/10");
    expect(within(missing).getByText("Sin cierre")).toBeVisible();
    expect(
      within(missing).getByRole("cell", { name: "Bs 300,00" }),
    ).toBeVisible();
    expect(missing).not.toHaveAttribute("data-difference");

    const adjusted = await rowOf("mié 21/10");
    expect(within(adjusted).getByText("Bs 0,00")).toHaveClass(
      "text-texto-secundario",
    );
    expect(within(adjusted).getByText("−Bs 250,00")).toHaveAttribute(
      "title",
      "Una venta registrada después del cierre cambió las ventas del día.",
    );

    const over = await rowOf("mar 20/10");
    expect(within(over).getByText("+Bs 5,00")).toHaveClass(
      "text-advertencia-texto",
    );
    expect(over).toHaveAttribute("data-difference", "over");

    expect(within(await rowOf("sáb 24/10")).getByText("Abierta")).toBeVisible();
    expect(
      screen.getByText(
        "5 días con ventas en efectivo · 3 cerrados · 1 sin cierre",
      ),
    ).toBeVisible();
  });

  it("moves to the previous month in the address", async () => {
    server.use(history(() => jsonResponse(october)));
    const { user } = renderAdmin("/back-office/caja?month=2026-10");
    await rowOf("vie 23/10");

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));

    await screen.findByText(formatMonth("2026-09"));
    expect(reads.at(-1)?.get("month")).toBe("2026-09");
  });

  it("says when the history cannot load", async () => {
    server.use(history(() => problemResponse(500, "server_error")));
    renderAdmin("/back-office/caja?month=2026-10");

    expect(
      await screen.findByText(/No pudimos cargar los cierres de caja/),
    ).toBeVisible();
  });
});

describe("AW151 Cierres de caja on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers());
  });

  it("labels each figure so the rows read as cards", async () => {
    server.use(history(() => jsonResponse(october)));
    renderAdmin("/back-office/caja?month=2026-10");

    const short = await rowOf("vie 23/10");
    expect(
      within(short).getByRole("cell", { name: "Bs 510,00" }),
    ).toHaveAttribute("data-label", "Contado");
    expect(
      within(short).getByRole("cell", { name: "−Bs 10,00" }),
    ).toHaveAttribute("data-label", "Diferencia");
  });
});
