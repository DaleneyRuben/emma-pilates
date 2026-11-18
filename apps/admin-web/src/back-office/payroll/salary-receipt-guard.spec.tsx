import { screen, waitFor, within } from "@testing-library/react";
import { delay, http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  emmaSeptember,
  payrollStaffHandler,
  salaryPage,
  salaryPaymentsPath,
} from "../../test/payroll-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { imageFile } from "../../test/image-stubs";
import {
  attachSalaryReceipt,
  salaryReceiptHandlers,
} from "../../test/salary-receipt-upload";
import { signedInHandlers } from "../../test/session-handlers";
import { uploadsPath } from "../../test/upload-fixtures";

const statement = {
  id: "statement-1",
  staffMemberId: "5f000000-0000-5000-8000-000000000002",
  staffMemberName: "Emma Vargas",
  month: "2026-09-01",
  periodStart: "2026-09-01",
  periodEnd: "2026-10-01",
  approvableOn: "2026-10-01",
  state: "draft",
  totalCentavos: 29_700,
  salaryPaymentId: null,
  lines: [],
};
const statementsPath = "/api/v1/administrator/pay-statements";
const hint =
  "Sin comprobante no se puede aprobar el pago. JPG, PNG o WebP, hasta 10 MB.";
const withReceipt = {
  ...emmaSeptember,
  receiptUrl: `${salaryPaymentsPath}/${emmaSeptember.id}/receipt`,
};

const openApproval = async () => {
  const rendered = renderAdmin("/dinero/sueldos?month=2026-09");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Aprobar pago" }),
  );
  const dialog = await screen.findByRole("alertdialog");
  const confirm = within(dialog).getByRole("button", {
    name: "Aprobar Bs 297,00",
  });
  return { ...rendered, dialog, confirm };
};

// Finding 112, review: the receipt a payment waits for is never stale, never
// half uploaded, and the grey button says why it is grey.
describe("the receipt Sueldos waits for", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...salaryReceiptHandlers());
  });

  it("says why approving is grey and forgets the photo when she goes back", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () => jsonResponse([statement])),
    );
    const { user, dialog, confirm } = await openApproval();
    expect(confirm).toHaveAccessibleDescription(hint);
    await attachSalaryReceipt(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "Volver" }));

    const again = await openApproval();
    expect(
      within(again.dialog).queryByText("Comprobante adjunto"),
    ).not.toBeInTheDocument();
    expect(again.confirm).toBeDisabled();
  });

  it("asks for the photo again when the one she uploaded is no longer usable", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () => jsonResponse([statement])),
      http.post(apiUrl(`${statementsPath}/statement-1/approve`), () =>
        problemResponse(409, "salary_receipt_not_ready"),
      ),
    );
    const { user, dialog, confirm } = await openApproval();
    await attachSalaryReceipt(user, dialog);
    await user.click(confirm);

    expect(
      await within(dialog).findByText(
        "No pudimos usar ese comprobante. Súbelo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText("Comprobante adjunto"),
    ).not.toBeInTheDocument();
    expect(confirm).toBeDisabled();
  });

  it("keeps Guardar grey while a new photo is still uploading", async () => {
    server.use(
      payrollStaffHandler(),
      http.get(apiUrl(salaryPaymentsPath), () =>
        jsonResponse(salaryPage([withReceipt])),
      ),
      http.post(apiUrl(uploadsPath), async () => {
        await delay("infinite");
        return jsonResponse({}, 201);
      }),
    );
    const { user } = renderAdmin("/dinero/sueldos/pagados");
    await user.click(
      await screen.findByRole("button", { name: "Emma Vargas" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar pago" });
    const save = within(panel).getByRole("button", { name: "Guardar" });
    expect(save).toBeEnabled();

    await user.upload(
      within(panel).getByLabelText("Archivo del comprobante"),
      imageFile("otra.png"),
    );

    await within(panel).findByText("Subiendo el comprobante…");
    await waitFor(() => expect(save).toBeDisabled());
  });
});
