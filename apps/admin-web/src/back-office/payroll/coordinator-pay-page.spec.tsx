import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { payrollStaffHandler } from "../../test/payroll-fixtures";
import { renderAdmin } from "../../test/render-admin";
import {
  attachSalaryReceipt,
  salaryReceiptHandlers,
} from "../../test/salary-receipt-upload";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";

const statement = {
  id: "statement-1",
  staffMemberId: "carolina",
  staffMemberName: "Carolina Rivas",
  month: "2025-12-01",
  periodStart: "2025-12-01",
  periodEnd: "2026-01-01",
  approvableOn: "2026-01-08",
  state: "draft",
  totalCentavos: 403_000,
  salaryPaymentId: null,
  lines: [
    { kind: "base", detail: "Base", amountCentavos: 350_000 },
    {
      kind: "new_client",
      detail: "Camila Rojas · Mensual 8 clases · 30 días",
      amountCentavos: 5_000,
    },
    { kind: "bonus", detail: "Bono de renovación", amountCentavos: 40_000 },
  ],
};

const statementsPath = "/api/v1/administrator/pay-statements";

// BKO-007 under Sueldos › Por aprobar (follow-up 232), beside the Trainers.
describe("the Coordinator's pay statement", () => {
  useMockServer();

  it("shows the draft and approves it once", async () => {
    let approved = 0;
    // Its own statements answer before Inicio's empty default.
    server.use(...signedInHandlers(), payrollStaffHandler());
    server.use(
      ...salaryReceiptHandlers(),
      http.get(apiUrl(statementsPath), () =>
        jsonResponse(
          approved === 0
            ? [statement]
            : [{ ...statement, state: "approved", salaryPaymentId: "pay-1" }],
        ),
      ),
      http.post(apiUrl(`${statementsPath}/statement-1/approve`), () => {
        approved += 1;
        return jsonResponse({
          ...statement,
          state: "approved",
          salaryPaymentId: "pay-1",
        });
      }),
    );
    const { user } = renderAdmin("/dinero/sueldos?month=2025-12");

    expect(
      await screen.findByRole("heading", { name: "Carolina Rivas" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Bs 4.030")).not.toHaveLength(0);
    expect(screen.getByText("Bono de renovación")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Aprobar Bs/ }));
    const dialog = await screen.findByRole("alertdialog");
    await attachSalaryReceipt(user, dialog);
    await user.click(
      within(dialog).getByRole("button", { name: "Aprobar Bs 4.030" }),
    );
    await waitFor(() => expect(approved).toBe(1));
    // FIX-084: once approved she leaves Por aprobar for Pagados.
    expect(
      await screen.findByText(/^Diciembre de 2025: todos los sueldos/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Aprobado")).not.toBeInTheDocument();
  });

  it("sends the Coordinator back to Horario", async () => {
    server.use(...coordinatorHandlers());
    const { router } = renderAdmin("/dinero/sueldos?month=2025-12");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Esa sección es solo para administración."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/horario"),
    );
  });

  it("refuses an Assistant", async () => {
    // Its own statements answer before Inicio's empty default.
    server.use(...signedInHandlers(), payrollStaffHandler());
    server.use(
      http.get(apiUrl(statementsPath), () =>
        problemResponse(403, "back_office_access_denied"),
      ),
    );
    renderAdmin("/dinero/sueldos?month=2025-12");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
