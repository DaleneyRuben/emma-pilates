import type { PaymentReviewDto } from "@pilates/api-contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { delay, http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  luciaPayment,
  paymentPage,
  paymentsPath,
  reviewOf,
  sofiaPayment,
} from "../test/payment-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const reviewReads: string[] = [];
const handlers = (
  respond: (paymentId: string) => Response | Promise<Response>,
) => [
  http.get(apiUrl(paymentsPath), () =>
    jsonResponse(paymentPage([sofiaPayment, luciaPayment])),
  ),
  http.get(apiUrl(`${paymentsPath}/:paymentId`), ({ params }) => {
    reviewReads.push(String(params.paymentId));
    return respond(String(params.paymentId));
  }),
];
const reviews: Record<string, PaymentReviewDto> = {
  [sofiaPayment.id]: reviewOf(sofiaPayment),
  [luciaPayment.id]: reviewOf(luciaPayment),
};
const answerReviews = () =>
  handlers((paymentId) => jsonResponse(reviews[paymentId] ?? {}));

const open = async (name: string) => {
  const rendered = renderAdmin("/back-office/pagos");
  await rendered.user.click(await screen.findByRole("button", { name }));
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Revisar pago" }),
  };
};

describe("AW29 Revisar pago on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reviewReads.length = 0;
    server.use(...signedInHandlers());
  });

  it("puts the amount asked, the date, and the method above the receipt", async () => {
    server.use(...answerReviews());
    const { panel } = await open("Sofía Guzmán");

    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(panel).getByText("Sofía Guzmán · Paquete de 8 clases"),
    ).toBeInTheDocument();
    expect(await within(panel).findByText("Monto a verificar")).toBeVisible();
    expect(within(panel).getByText("Bs 500,00")).toBeInTheDocument();
    expect(within(panel).getByText("Precio del plan")).toBeInTheDocument();
    expect(within(panel).getByText("Bs 560,00")).toBeInTheDocument();
    expect(within(panel).getByText("Crédito aplicado")).toBeInTheDocument();
    expect(within(panel).getByText("−Bs 60,00")).toBeInTheDocument();
    expect(within(panel).getByText("21/09/2026 · 14:05")).toBeInTheDocument();
    expect(within(panel).getByText("Transferencia")).toBeInTheDocument();
    const receipt = within(panel).getByRole("img", {
      name: "Comprobante de Sofía Guzmán",
    });
    expect(receipt).toHaveAttribute(
      "src",
      `${paymentsPath}/${sofiaPayment.id}/receipt`,
    );
    expect(within(panel).getByText("Comprobante · JPG")).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Confirmar pago" }),
    ).toBeEnabled();
    expect(
      within(panel).getByRole("button", { name: "Rechazar" }),
    ).toBeEnabled();
    expect(reviewReads).toEqual([sofiaPayment.id]);
  });

  it("leaves out the Credit lines when the Client paid the whole price", async () => {
    server.use(...answerReviews());
    const { panel } = await open("Lucía Fernández");

    expect(await within(panel).findByText("Bs 1.050,00")).toBeInTheDocument();
    expect(
      within(panel).queryByText("Crédito aplicado"),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByText("Precio del plan"),
    ).not.toBeInTheDocument();
  });

  it("says it is loading while the Payment is on its way", async () => {
    server.use(
      ...handlers(async (paymentId) => {
        await delay(200);
        return jsonResponse(reviews[paymentId] ?? {});
      }),
    );
    const { panel } = await open("Sofía Guzmán");

    expect(within(panel).getByText("Cargando el pago…")).toBeInTheDocument();
    expect(await within(panel).findByText("Monto a verificar")).toBeVisible();
  });

  it("enlarges the receipt above the panel and returns to it unchanged", async () => {
    server.use(...answerReviews());
    const { panel, user } = await open("Sofía Guzmán");

    await user.click(
      await within(panel).findByRole("button", { name: "Ver en grande" }),
    );
    const viewer = await screen.findByRole("dialog", {
      name: "Comprobante ampliado",
    });
    expect(
      within(viewer).getByRole("img", {
        name: "Comprobante de Sofía Guzmán, ampliado",
      }),
    ).toHaveAttribute("src", `${paymentsPath}/${sofiaPayment.id}/receipt`);
    expect(
      within(viewer).queryByRole("button", { name: "Confirmar pago" }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Comprobante ampliado" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Revisar pago" }),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", {
        name: /Comprobante de Sofía Guzmán/,
      }),
    );
    const again = await screen.findByRole("dialog", {
      name: "Comprobante ampliado",
    });
    await user.click(within(again).getByRole("button", { name: "Cerrar" }));
    expect(
      screen.getByRole("dialog", { name: "Revisar pago" }),
    ).toBeInTheDocument();
  });

  it("says a receipt that is no longer kept cannot be shown", async () => {
    server.use(
      ...handlers(() =>
        jsonResponse(
          reviewOf(sofiaPayment, { receipt: null, receiptUrl: null }),
        ),
      ),
    );
    const { panel } = await open("Sofía Guzmán");

    expect(
      await within(panel).findByText("El comprobante ya no está disponible."),
    ).toBeInTheDocument();
    expect(within(panel).queryByRole("img")).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Ver en grande" }),
    ).not.toBeInTheDocument();
  });

  it("asks the backend again when the receipt image cannot be read", async () => {
    server.use(...answerReviews());
    const { panel, user } = await open("Sofía Guzmán");

    fireEvent.error(
      await within(panel).findByRole("img", {
        name: "Comprobante de Sofía Guzmán",
      }),
    );
    expect(
      await within(panel).findByText("No pudimos mostrar el comprobante."),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Ver en grande" }),
    ).not.toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Reintentar" }));

    expect(
      await within(panel).findByRole("img", {
        name: "Comprobante de Sofía Guzmán",
      }),
    ).toBeInTheDocument();
    expect(reviewReads).toEqual([sofiaPayment.id, sofiaPayment.id]);
  });

  it("shows a Payment someone else already decided without its actions", async () => {
    server.use(
      ...handlers(() =>
        jsonResponse(
          reviewOf(sofiaPayment, {
            state: "confirmed",
            decidedAt: "2026-09-21T19:00:00.000Z",
          }),
        ),
      ),
    );
    const { panel } = await open("Sofía Guzmán");

    expect(
      await within(panel).findByText("Otra persona ya decidió este pago."),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Confirmado")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Confirmar pago" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Rechazar" }),
    ).not.toBeInTheDocument();
  });

  it("names the reason of a rejection someone else already made", async () => {
    server.use(
      ...handlers(() =>
        jsonResponse(
          reviewOf(sofiaPayment, {
            state: "rejected",
            decidedAt: "2026-09-21T19:00:00.000Z",
            rejectionReason: "El monto no coincide.",
          }),
        ),
      ),
    );
    const { panel } = await open("Sofía Guzmán");

    expect(await within(panel).findByText("Rechazado")).toBeInTheDocument();
    expect(within(panel).getByText("Motivo")).toBeInTheDocument();
    expect(
      within(panel).getByText("El monto no coincide."),
    ).toBeInTheDocument();
  });

  it("offers a retry when the Payment cannot load and says when it is gone", async () => {
    let answer = () => problemResponse(500, "unexpected_error");
    server.use(...handlers(() => answer()));
    const { panel, user } = await open("Sofía Guzmán");

    expect(
      await within(panel).findByText(
        "No pudimos cargar el pago.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();

    answer = () => problemResponse(404, "payment_not_found");
    await user.click(within(panel).getByRole("button", { name: "Reintentar" }));
    expect(
      await within(panel).findByText(
        "Este pago ya no existe. Cierra el panel y vuelve a abrir la lista.",
      ),
    ).toBeInTheDocument();
  });
});

describe("AW29 Revisar pago on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("fills the screen and enlarges the receipt as a full-screen sheet", async () => {
    server.use(...answerReviews());
    const { panel, user } = await open("Sofía Guzmán");

    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    await user.click(
      await within(panel).findByRole("button", { name: "Ver en grande" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Comprobante ampliado" }),
    ).toHaveAttribute("data-presentation", "full-screen");
  });
});
