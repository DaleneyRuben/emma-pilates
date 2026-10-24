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
import { signedInHandlers } from "../../test/session-handlers";

const statement = {
  id: "statement-1",
  staffMemberId: "emma",
  staffMemberName: "Emma Vargas",
  month: "2026-09-01",
  state: "draft",
  totalCentavos: 32_200,
  salaryPaymentId: null,
  lines: [
    { kind: "class", detail: "3 alumnas", amountCentavos: 6_500 },
    { kind: "class", detail: "6 alumnas, 2 extra", amountCentavos: 8_100 },
    { kind: "commission", detail: "Primer plan", amountCentavos: 7_800 },
  ],
};

const statementsPath = "/api/v1/administrator/pay-statements";

describe("Pagos a instructoras", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers());
  });

  it("shows the draft and approves it once", async () => {
    let approved = 0;
    server.use(
      http.get(apiUrl(statementsPath), () =>
        jsonResponse(
          approved === 0 ? [statement] : [{ ...statement, state: "approved" }],
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
    const { user } = renderAdmin(
      "/back-office/pagos-instructoras?month=2026-09",
    );

    expect(
      await screen.findByRole("heading", { name: "Emma Vargas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bs 322,00")).toBeInTheDocument();
    expect(screen.getByText("3 alumnas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    await waitFor(() => expect(approved).toBe(1));
    expect(await screen.findByText("Aprobado")).toBeInTheDocument();
  });

  it("refuses an Assistant", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () =>
        problemResponse(403, "back_office_access_denied"),
      ),
    );
    renderAdmin("/back-office/pagos-instructoras?month=2026-09");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
