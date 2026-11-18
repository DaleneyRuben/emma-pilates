import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../../test/msw";
import { renderAdmin } from "../../../test/render-admin";
import { signedInHandlers } from "../../../test/session-handlers";

const emmaId = "5f000000-0000-5000-8000-000000000002";
const statement = {
  id: "statement-1",
  staffMemberId: emmaId,
  staffMemberName: "Emma Vargas",
  month: "2026-09-01",
  periodStart: "2026-09-01",
  periodEnd: "2026-10-01",
  approvableOn: "2026-10-01",
  state: "draft",
  totalCentavos: 29_700,
  salaryPaymentId: null,
  lines: [
    {
      kind: "class",
      detail: "lun 7 sep · 10:45 · Centro · Reformer · 1 alumna",
      amountCentavos: 29_700,
    },
  ],
};
const statementsPath = "/api/v1/administrator/pay-statements";
const qrPath = `/api/v1/administrator/staff-members/${emmaId}/payout-qr`;

// FIX-072, follow-up 276: «Aprobar pago» shows the person's payout QR, or
// why there is none, and after approving leads to the receipt.
describe("payout QR in Sueldos' «Aprobar pago»", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers());
  });

  it("shows her QR before approving and leads to her receipt after", async () => {
    let approved = false;
    server.use(
      http.get(apiUrl(statementsPath), () =>
        jsonResponse([
          approved ? { ...statement, state: "approved" } : statement,
        ]),
      ),
      http.post(apiUrl(`${statementsPath}/statement-1/approve`), () => {
        approved = true;
        return jsonResponse({
          ...statement,
          state: "approved",
          salaryPaymentId: "pay-1",
        });
      }),
      http.get(apiUrl(qrPath), () =>
        jsonResponse({
          payoutQr: {
            id: "qr-emma",
            validUntil: "2026-12-15",
            standing: "valid",
            imageUrl: "/api/v1/administrator/payout-qrs/qr-emma/image",
          },
        }),
      ),
    );
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    await user.click(
      await screen.findByRole("button", { name: "Aprobar pago" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(
      await within(dialog).findByRole("img", {
        name: "QR de cobro de Emma Vargas",
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Vale hasta el 15/12/2026")).toBeVisible();

    await user.click(
      within(dialog).getByRole("button", { name: "Aprobar Bs 297,00" }),
    );
    await waitFor(() => expect(approved).toBe(true));
    expect(
      await screen.findByText(
        "Aprobamos Bs 297,00 a Emma Vargas. Quedó en Pagados. ¿Ya le transferiste? Sube el comprobante y Emma lo verá en su app.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Subir comprobante" }),
    ).toHaveAttribute(
      "href",
      `/dinero/sueldos/pagados?staffMemberId=${emmaId}`,
    );
  });

  it("says when her QR has expired instead of showing it", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () => jsonResponse([statement])),
      http.get(apiUrl(qrPath), () =>
        jsonResponse({
          payoutQr: {
            id: "qr-emma",
            validUntil: "2026-11-01",
            standing: "expired",
            imageUrl: null,
          },
        }),
      ),
    );
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    await user.click(
      await screen.findByRole("button", { name: "Aprobar pago" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(
      await within(dialog).findByText("QR vencido · pídele uno nuevo"),
    ).toBeVisible();
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
  });
});
