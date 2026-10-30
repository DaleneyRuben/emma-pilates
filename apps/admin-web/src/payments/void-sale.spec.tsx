import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
  valeriaPayment,
} from "../test/payment-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const voidedSale = paymentRow("09", "Camila Rojas", {
  state: "voided",
  voidReason: "Se registró el plan equivocado",
  decidedAt: "2026-09-21T16:00:00.000Z",
  receiptAvailable: false,
});

const voids: { reason: string }[] = [];

describe("AW28 Anular venta", () => {
  useMockServer();
  beforeEach(() => {
    voids.length = 0;
    server.use(...signedInHandlers(), pendingBadgeHandler(0));
  });

  it("asks for a reason and voids the confirmed sale", async () => {
    server.use(
      http.get(apiUrl(paymentsPath), ({ request }) => {
        const status = new URL(request.url).searchParams.get("status");
        if (status === "confirmed") {
          return jsonResponse(
            paymentPage([valeriaPayment], { pendingCount: 0 }),
          );
        }
        return jsonResponse(paymentPage([voidedSale], { pendingCount: 0 }));
      }),
      http.post(
        apiUrl(`${paymentsPath}/:paymentId/void`),
        async ({ request }) => {
          voids.push((await request.json()) as { reason: string });
          return jsonResponse({
            paymentId: valeriaPayment.id,
            state: "voided",
            voidReason: voids[0]?.reason,
            cancelledBookings: 1,
          });
        },
      ),
    );
    const { user } = renderAdmin("/back-office/pagos");
    await screen.findByRole("heading", { level: 1, name: "Pagos" });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Estado" }),
      "confirmed",
    );
    const row = (await screen.findByRole("cell", { name: /Valeria Quiroga/ }))
      .parentElement as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Anular venta" }));

    const dialog = await screen.findByRole("alertdialog", {
      name: /Anular la venta/,
    });
    const confirm = within(dialog).getByRole("button", {
      name: "Anular venta",
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Motivo" }), {
      target: { value: "   " },
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Motivo" }), {
      target: { value: "Se registró el plan equivocado" },
    });
    await user.click(confirm);

    await waitFor(() =>
      expect(voids).toEqual([{ reason: "Se registró el plan equivocado" }]),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Estado" }),
      "voided",
    );
    const voided = (await screen.findByRole("cell", { name: /Camila Rojas/ }))
      .parentElement as HTMLElement;
    expect(
      within(voided).getByText("Se registró el plan equivocado"),
    ).toBeVisible();
    expect(within(voided).getByText("Anulado")).toBeVisible();
  });

  it("keeps the dialog open when the void is refused", async () => {
    server.use(
      http.get(apiUrl(paymentsPath), () =>
        jsonResponse(paymentPage([valeriaPayment], { pendingCount: 0 })),
      ),
      http.post(apiUrl(`${paymentsPath}/:paymentId/void`), () =>
        problemResponse(409, "payment_already_voided"),
      ),
    );
    const { user } = renderAdmin("/back-office/pagos?status=confirmed");
    const row = (await screen.findByRole("cell", { name: /Valeria Quiroga/ }))
      .parentElement as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Anular venta" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Motivo" }), {
      target: { value: "Un error de caja" },
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Anular venta" }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Esta venta ya fue anulada.",
    );
  });

  it("hides Anular venta on a confirmed evaluation", async () => {
    const evaluation = paymentRow("05", "Lucía Fernández", {
      state: "confirmed",
      kind: "evaluation",
      planName: "Evaluación nutricional",
      decidedAt: "2026-09-20T15:00:00.000Z",
    });
    server.use(
      http.get(apiUrl(paymentsPath), () =>
        jsonResponse(paymentPage([evaluation], { pendingCount: 0 })),
      ),
    );
    renderAdmin("/back-office/pagos?status=confirmed");
    const row = (await screen.findByRole("cell", { name: /Lucía Fernández/ }))
      .parentElement as HTMLElement;

    expect(
      within(row).queryByRole("button", { name: "Anular venta" }),
    ).not.toBeInTheDocument();
  });
});
