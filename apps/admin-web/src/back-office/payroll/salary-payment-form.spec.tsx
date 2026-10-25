import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, boliviaToday } from "../../lib/bolivia-time";
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
  salaryRow,
} from "../../test/payroll-fixtures";
import { camila, emma, rita } from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const uuid = /^[0-9a-f-]{36}$/;
let tableReads = 0;
const payrollTable = (rows = () => [emmaSeptember]) =>
  http.get(apiUrl(salaryPaymentsPath), () => {
    tableReads += 1;
    return jsonResponse(salaryPage(rows()));
  });

const openCreate = async () => {
  const rendered = renderAdmin("/back-office/nomina");
  await screen.findByRole("cell", { name: /Emma Vargas/ });
  await rendered.user.click(
    screen.getByRole("button", { name: "Registrar pago" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Registrar pago" });
  return { ...rendered, panel };
};

const fill = async (
  panel: HTMLElement,
  user: ReturnType<typeof renderAdmin>["user"],
  values: { staffMemberId: string; amount: string; date: string },
) => {
  await user.selectOptions(
    within(panel).getByLabelText("Empleado"),
    values.staffMemberId,
  );
  await user.clear(within(panel).getByLabelText("Monto"));
  await user.type(within(panel).getByLabelText("Monto"), values.amount);
  await user.clear(within(panel).getByLabelText("Fecha"));
  await user.type(within(panel).getByLabelText("Fecha"), values.date);
};

describe("AW12 Salary Payment form on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    tableReads = 0;
    server.use(...signedInHandlers());
    server.use(payrollStaffHandler());
  });

  it("records a payment after validating it and refreshes the payroll", async () => {
    const sent: { key: string | null; body: unknown }[] = [];
    server.use(
      payrollTable(() =>
        sent.length === 0
          ? [emmaSeptember]
          : [salaryRow("03", camila, 150_000, "2026-09-21"), emmaSeptember],
      ),
      http.post(apiUrl(salaryPaymentsPath), async ({ request }) => {
        sent.push({
          key: request.headers.get("idempotency-key"),
          body: await request.json(),
        });
        return jsonResponse(
          salaryRow("03", camila, 150_000, "2026-09-21"),
          201,
        );
      }),
    );
    const { panel, user } = await openCreate();
    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(within(panel).getByLabelText("Empleado")).getByRole("option", {
        name: "Rita Salas (cuenta desactivada)",
      }),
    ).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      within(panel).getByLabelText("Empleado"),
    ).toHaveAccessibleDescription("Elige a quién le pagaste.");
    expect(within(panel).getByLabelText("Monto")).toHaveAccessibleDescription(
      expect.stringContaining("Escribe un monto como 3.500,00."),
    );
    expect(within(panel).getByLabelText("Fecha")).toHaveAccessibleDescription(
      "Elige la fecha del pago.",
    );

    await fill(panel, user, {
      staffMemberId: camila.id,
      amount: "1.500",
      date: "2026-09-21",
    });
    const readsBefore = tableReads;
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText("Pago de Bs 1.500,00 a Camila Rojas registrado."),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      {
        key: expect.stringMatching(uuid),
        body: {
          staffMemberId: camila.id,
          amountCentavos: 150_000,
          paidOn: "2026-09-21",
        },
      },
    ]);
    await waitFor(() => expect(tableReads).toBeGreaterThan(readsBefore));
  });

  it("refuses a date after today in Bolivia before and after asking", async () => {
    server.use(
      payrollTable(),
      http.post(apiUrl(salaryPaymentsPath), () =>
        problemResponse(400, "date_in_future"),
      ),
    );
    const { panel, user } = await openCreate();
    expect(within(panel).getByLabelText("Fecha")).toHaveAttribute(
      "placeholder",
      "dd/mm/aaaa",
    );
    await fill(panel, user, {
      staffMemberId: emma.id,
      amount: "3500",
      date: addDays(boliviaToday(), 1),
    });
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(within(panel).getByLabelText("Fecha")).toHaveAccessibleDescription(
      "La fecha no puede ser posterior a hoy.",
    );

    // The browser's day may already be the Bolivia tomorrow; the backend
    // still decides.
    await user.clear(within(panel).getByLabelText("Fecha"));
    await user.type(within(panel).getByLabelText("Fecha"), boliviaToday());
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(within(panel).getByLabelText("Fecha")).toHaveAccessibleDescription(
        "La fecha no puede ser posterior a hoy.",
      ),
    );
  });

  it("corrects a payment from its row and sends nothing when nothing changed", async () => {
    const puts: unknown[] = [];
    server.use(
      payrollTable(),
      http.put(
        apiUrl(`${salaryPaymentsPath}/${emmaSeptember.id}`),
        async ({ request }) => {
          puts.push(await request.json());
          return jsonResponse({ ...emmaSeptember, amountCentavos: 360_000 });
        },
      ),
    );
    const { user } = renderAdmin("/back-office/nomina");
    await user.click(
      await screen.findByRole("button", { name: "Emma Vargas" }),
    );
    let panel = await screen.findByRole("dialog", { name: "Editar pago" });
    expect(within(panel).getByLabelText("Empleado")).toHaveValue(emma.id);
    expect(within(panel).getByLabelText("Monto")).toHaveValue("3.500,00");
    expect(within(panel).getByLabelText("Fecha")).toHaveValue("20/09/2026");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(puts).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Emma Vargas" }));
    panel = await screen.findByRole("dialog", { name: "Editar pago" });
    await user.clear(within(panel).getByLabelText("Monto"));
    await user.type(within(panel).getByLabelText("Monto"), "3.600,00");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText(
        "Guardamos la corrección del pago de Emma Vargas.",
      ),
    ).toBeInTheDocument();
    expect(puts).toEqual([
      { staffMemberId: emma.id, amountCentavos: 360_000, paidOn: "2026-09-20" },
    ]);
  });

  it("points at the Staff Member the backend no longer finds", async () => {
    server.use(
      payrollTable(),
      http.post(apiUrl(salaryPaymentsPath), () =>
        problemResponse(404, "staff_member_not_found"),
      ),
    );
    const { panel, user } = await openCreate();
    await fill(panel, user, {
      staffMemberId: rita.id,
      amount: "200",
      date: "2026-09-01",
    });
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(
        within(panel).getByLabelText("Empleado"),
      ).toHaveAccessibleDescription(
        "Esta persona ya no está en el personal. Elige otra.",
      ),
    );
  });
});

describe("AW12 Salary Payment form on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(payrollStaffHandler());
  });

  it("fills the screen", async () => {
    server.use(payrollTable());
    const { panel } = await openCreate();
    expect(panel).toHaveAttribute("data-presentation", "full-screen");
  });
});
