import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";

const statement = {
  id: "statement-1",
  staffMemberId: "carolina",
  staffMemberName: "Carolina Rivas",
  month: "2026-12-01",
  state: "draft",
  totalCentavos: 403_000,
  salaryPaymentId: null,
  lines: [
    { kind: "base", detail: "Base", amountCentavos: 350_000 },
    { kind: "new_client", detail: "Clienta nueva", amountCentavos: 5_000 },
    { kind: "bonus", detail: "Bono de renovación", amountCentavos: 40_000 },
  ],
};

const statementsPath = "/api/v1/administrator/pay-statements";

describe("Pago a la coordinadora", () => {
  useMockServer();

  it("shows the draft and approves it once", async () => {
    let approved = 0;
    server.use(
      ...signedInHandlers(),
      http.get(apiUrl(statementsPath), () => jsonResponse([statement])),
      http.post(apiUrl(`${statementsPath}/statement-1/approve`), () => {
        approved += 1;
        return jsonResponse({
          ...statement,
          state: "approved",
          salaryPaymentId: "pay-1",
        });
      }),
    );
    const { user } = renderAdmin(
      "/back-office/pago-coordinadora?month=2026-12",
    );

    expect(
      await screen.findByRole("heading", { name: "Carolina Rivas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bs 4.030,00")).toBeInTheDocument();
    expect(screen.getByText("Bono de renovación")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    await waitFor(() => expect(approved).toBe(1));
    expect(await screen.findByText("Aprobado")).toBeInTheDocument();
  });

  it("sends the Coordinator back to Horario", async () => {
    server.use(...coordinatorHandlers());
    const { router } = renderAdmin(
      "/back-office/pago-coordinadora?month=2026-12",
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Esa sección es solo para administración."),
    ).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });

  it("refuses an Assistant", async () => {
    server.use(
      ...signedInHandlers(),
      http.get(apiUrl(statementsPath), () =>
        problemResponse(403, "back_office_access_denied"),
      ),
    );
    renderAdmin("/back-office/pago-coordinadora?month=2026-12");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
