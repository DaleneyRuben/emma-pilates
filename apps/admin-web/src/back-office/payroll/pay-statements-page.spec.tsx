import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  addDays,
  boliviaMonth,
  boliviaToday,
  formatMonth,
} from "../../lib/bolivia-time";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import {
  attachSalaryReceipt,
  salaryReceiptHandlers,
} from "../../test/salary-receipt-upload";
import { emma, staffPage } from "../../test/people-fixtures";
import { payrollStaffHandler } from "../../test/payroll-fixtures";
import { signedInHandlers } from "../../test/session-handlers";

const minimum = (time: string) => ({
  kind: "minimum_not_met",
  detail: `lun 7 sep · ${time} · Centro · Reformer`,
  amountCentavos: 2_500,
});

const statement = {
  id: "statement-1",
  staffMemberId: emma.id,
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
      amountCentavos: 6_500,
    },
    {
      kind: "class",
      detail: "lun 7 sep · 18:00 · Centro · Mat · 6 alumnas, 2 extra",
      amountCentavos: 8_100,
    },
    minimum("07:00"),
    minimum("08:15"),
    {
      kind: "commission",
      detail: "Nora Pay · Mensual · 10 % de Bs 1.010",
      amountCentavos: 10_100,
    },
  ],
};

const statementsPath = "/api/v1/administrator/pay-statements";

// Finding 105 (follow-up 274, option A): concepts with subtotals that open,
// a small «Aprobar pago» that confirms, never offered before it can work.
describe("Sueldos por aprobar", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), payrollStaffHandler());
  });

  it("shows one card per person with role, period, total, concepts and every line", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () => jsonResponse([statement])),
    );
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    const card = await screen.findByRole("article", { name: "Emma Vargas" });
    expect(
      await within(card).findByText("Entrenadora · Septiembre de 2026"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Bs 297,00")).toBeInTheDocument();
    const minimumRow = within(card).getByText(
      "Canceladas por mínimo (2 × Bs 25,00)",
    ).parentElement!;
    expect(within(minimumRow).getByText("Bs 50,00")).toBeInTheDocument();
    expect(
      within(card).getByText("Comisiones de primer plan (1)"),
    ).toBeInTheDocument();
    expect(within(card).queryByText(/07:00/)).not.toBeInTheDocument();

    await user.click(
      within(card).getByRole("button", { name: "Ver las 5 líneas" }),
    );
    expect(
      within(card).getByText("lun 7 sep · 07:00 · Centro · Reformer"),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Nora Pay · Mensual · 10 % de Bs 1.010"),
    ).toBeInTheDocument();
    await user.click(
      within(card).getByRole("button", { name: "Ocultar las líneas" }),
    );
    expect(within(card).queryByText(/07:00/)).not.toBeInTheDocument();
  });

  it("lists only who still waits: an approved person is never in Por aprobar", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () =>
        jsonResponse([
          statement,
          {
            ...statement,
            id: "statement-2",
            staffMemberId: "valeria",
            staffMemberName: "Valeria Peña",
            state: "approved",
            salaryPaymentId: "pay-2",
          },
        ]),
      ),
    );
    renderAdmin("/dinero/sueldos?month=2026-09");

    await screen.findByRole("article", { name: "Emma Vargas" });
    expect(
      screen.queryByRole("article", { name: "Valeria Peña" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Aprobado")).not.toBeInTheDocument();
  });

  it("asks before approving and approves once", async () => {
    let approved = 0;
    server.use(
      ...salaryReceiptHandlers(),
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
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    await user.click(
      await screen.findByRole("button", { name: "Aprobar Bs 297,00" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Aprobar Bs 297,00 a Emma Vargas por septiembre de 2026?",
    });
    expect(within(dialog).getByText("5 líneas")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Volver" }));
    expect(approved).toBe(0);

    await user.click(screen.getByRole("button", { name: "Aprobar Bs 297,00" }));
    const confirming = await screen.findByRole("alertdialog");
    await attachSalaryReceipt(user, confirming);
    await user.click(
      within(confirming).getByRole("button", { name: "Aprobar Bs 297,00" }),
    );
    await waitFor(() => expect(approved).toBe(1));
    expect(
      await screen.findByText(
        "Aprobamos Bs 297,00 a Emma Vargas con su comprobante. Quedó en Pagados y Emma lo verá en su app.",
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Septiembre de 2026: todos los sueldos están aprobados.",
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: "Emma Vargas" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Aprobado")).not.toBeInTheDocument();
  });

  it("greys the button until the period can be paid, and points to Otro período", async () => {
    const month = boliviaMonth();
    const nextMonth = addDays(`${month}-28`, 7).slice(0, 7);
    server.use(
      http.get(apiUrl(statementsPath), () =>
        jsonResponse([
          {
            ...statement,
            month: `${month}-01`,
            periodStart: `${month}-01`,
            periodEnd: `${nextMonth}-01`,
            approvableOn: `${nextMonth}-01`,
          },
        ]),
      ),
    );
    const { user, router } = renderAdmin(`/dinero/sueldos?month=${month}`);

    const card = await screen.findByRole("article", { name: "Emma Vargas" });
    const waiting = within(card).getByRole("button", {
      name: /^Se aprueba desde el 1 de /,
    });
    expect(waiting).toBeDisabled();
    expect(
      within(card).queryByRole("button", { name: /^Aprobar/ }),
    ).not.toBeInTheDocument();
    const monthName = formatMonth(month).split(" ")[0] ?? "";
    expect(
      screen.getByText(
        new RegExp(
          `^${monthName} cierra el \\d+\\. Para pagarle antes a una instructora, elige «Otro período»\\.$`,
          "i",
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/todavía no terminó/)).not.toBeInTheDocument();

    const today = boliviaToday();
    if (today.endsWith("-01")) return;
    await user.click(screen.getByRole("button", { name: "Otro período" }));
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        period: "range",
        from: `${month}-01`,
        to: addDays(today, -1),
      }),
    );
  });

  it("says the Coordinator's bonus waits for the renewals", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () =>
        jsonResponse([
          {
            ...statement,
            id: "statement-3",
            staffMemberId: "carolina",
            staffMemberName: "Carolina Rivas",
            approvableOn: "2999-12-08",
            totalCentavos: 28_000,
            lines: [
              {
                kind: "new_client",
                detail: "Nora Pay",
                amountCentavos: 28_000,
              },
            ],
          },
        ]),
      ),
    );
    server.use(
      http.get(apiUrl("/api/v1/administrator/staff-members"), () =>
        jsonResponse({
          ...staffPage([
            {
              ...emma,
              id: "carolina",
              name: "Carolina Rivas",
              role: "coordinator",
            },
          ]),
          pageSize: 100,
        }),
      ),
    );
    renderAdmin("/dinero/sueldos?month=2026-09");

    const card = await screen.findByRole("article", { name: "Carolina Rivas" });
    expect(
      await within(card).findByText("Coordinadora · Septiembre de 2026"),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Su bono espera las renovaciones"),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: /^Se aprueba desde el 8 de / }),
    ).toBeDisabled();
  });

  it("explains a refused approval instead of a bare failure", async () => {
    server.use(
      ...salaryReceiptHandlers(),
      http.get(apiUrl(statementsPath), () => jsonResponse([statement])),
      http.post(apiUrl(`${statementsPath}/statement-1/approve`), () =>
        problemResponse(409, "pay_statement_month_open"),
      ),
    );
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    await user.click(
      await screen.findByRole("button", { name: "Aprobar Bs 297,00" }),
    );
    const confirming = await screen.findByRole("alertdialog");
    await attachSalaryReceipt(user, confirming);
    await user.click(
      within(confirming).getByRole("button", { name: "Aprobar Bs 297,00" }),
    );
    expect(
      await screen.findByText(
        "Todavía no se puede aprobar: el período no terminó. Para pagarle antes a una instructora, elige Rango hasta ayer y vuelve a calcular.",
      ),
    ).toBeInTheDocument();
  });

  it("says what changed after recalculating", async () => {
    let drafted = 0;
    server.use(
      http.get(apiUrl(statementsPath), () =>
        jsonResponse([
          drafted === 0
            ? statement
            : {
                ...statement,
                totalCentavos: 32_200,
                lines: [...statement.lines, minimum("19:15")],
              },
        ]),
      ),
      http.post(apiUrl(`${statementsPath}/draft`), () => {
        drafted += 1;
        return jsonResponse({ drafted: 1 });
      }),
    );
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    await screen.findByRole("article", { name: "Emma Vargas" });
    await user.click(screen.getByRole("button", { name: "Volver a calcular" }));
    expect(
      await screen.findByText(
        /^Recalculamos septiembre de 2026 a las \d\d:\d\d\. Cambió 1 sueldo: Emma Vargas pasó de Bs 297,00 a Bs 322,00\.$/,
      ),
    ).toBeInTheDocument();
  });

  it("says when recalculating changed nothing", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () => jsonResponse([statement])),
      http.post(apiUrl(`${statementsPath}/draft`), () =>
        jsonResponse({ drafted: 0 }),
      ),
    );
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    await screen.findByRole("article", { name: "Emma Vargas" });
    await user.click(screen.getByRole("button", { name: "Volver a calcular" }));
    expect(
      await screen.findByText(
        /^Recalculamos septiembre de 2026 a las \d\d:\d\d\. Ningún sueldo cambió\.$/,
      ),
    ).toBeInTheDocument();
  });

  it("refuses an Assistant", async () => {
    server.use(
      http.get(apiUrl(statementsPath), () =>
        problemResponse(403, "back_office_access_denied"),
      ),
    );
    renderAdmin("/dinero/sueldos?month=2026-09");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
