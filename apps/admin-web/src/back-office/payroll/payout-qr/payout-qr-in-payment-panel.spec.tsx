import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../../test/msw";
import {
  emmaSeptember,
  payrollStaffHandler,
  salaryPage,
  salaryPaymentsPath,
} from "../../../test/payroll-fixtures";
import { camila, emma } from "../../../test/people-fixtures";
import { renderAdmin } from "../../../test/render-admin";
import { signedInHandlers } from "../../../test/session-handlers";

const qrPath = (staffMemberId: string) =>
  `/api/v1/administrator/staff-members/${staffMemberId}/payout-qr`;
const emmaQrImage = "/api/v1/administrator/payout-qrs/qr-emma/image";

// FIX-072, follow-up 276: Pagados › Registrar pago shows the person's payout
// QR as soon as she is chosen, or why there is none to pay to.
describe("payout QR in AW12's Registrar pago", () => {
  useMockServer();
  beforeEach(() => {
    server.use(
      ...signedInHandlers(),
      payrollStaffHandler(),
      http.get(apiUrl(salaryPaymentsPath), () =>
        jsonResponse(salaryPage([emmaSeptember])),
      ),
    );
    // After the signed-in defaults, so these answers win.
    server.use(
      http.get(apiUrl(qrPath(emma.id)), () =>
        jsonResponse({
          payoutQr: {
            id: "qr-emma",
            validUntil: "2026-12-15",
            standing: "valid",
            imageUrl: emmaQrImage,
          },
        }),
      ),
      http.get(apiUrl(qrPath(camila.id)), () =>
        jsonResponse({ payoutQr: null }),
      ),
    );
  });

  it("shows the chosen person's QR, and the notice for someone without one", async () => {
    const { user } = renderAdmin("/dinero/sueldos/pagados");
    await screen.findByRole("cell", { name: /Emma Vargas/ });
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    const panel = await screen.findByRole("dialog", { name: "Registrar pago" });
    expect(
      within(panel).queryByText("Sin QR de cobro"),
    ).not.toBeInTheDocument();

    await user.selectOptions(within(panel).getByLabelText("Persona"), emma.id);
    expect(
      await within(panel).findByRole("img", {
        name: "QR de cobro de Emma Vargas",
      }),
    ).toHaveAttribute("src", `${emmaQrImage}?variant=readable`);
    expect(within(panel).getByText("Vale hasta el mar 15 dic")).toBeVisible();

    await user.selectOptions(
      within(panel).getByLabelText("Persona"),
      camila.id,
    );
    expect(await within(panel).findByText("Sin QR de cobro")).toBeVisible();
    expect(
      within(panel).getByText(
        "Camila todavía no subió su QR de cobro. Pídele que lo suba en la app, en Perfil › Mi QR de cobro.",
      ),
    ).toBeVisible();
  });
});
