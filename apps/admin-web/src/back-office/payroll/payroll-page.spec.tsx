import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  camilaSeptember,
  emmaSeptember,
  payrollStaffHandler,
  salaryPage,
  salaryPaymentsPath,
} from "../../test/payroll-fixtures";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { emma, rita } from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";
import { expectBrandedLoading } from "../../test/branded-loading";

const reads: URLSearchParams[] = [];
const payrollTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(salaryPaymentsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Nómina" });
const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

describe("AW11 Nómina on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
    server.use(payrollStaffHandler());
  });

  it("lists the studio's Salary Payments newest first with their amounts and dates", async () => {
    server.use(
      payrollTable(() =>
        jsonResponse(salaryPage([emmaSeptember, camilaSeptember])),
      ),
    );
    renderAdmin("/dinero/sueldos/pagados");
    await heading();

    expectBrandedLoading("Cargando pagos…");
    const row = await rowOf("Emma Vargas");
    const amount = within(row).getByRole("cell", { name: "Bs 3.500,00" });
    expect(amount).toHaveAttribute("data-label", "Monto");
    expect(amount).toHaveClass("md:text-right");
    expect(within(row).getByRole("cell", { name: "20/09/2026" })).toBeVisible();
    expect(
      within(await rowOf("Camila Rojas")).getByText("Bs 2.800,50"),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Todo el estudio · solo registra que el pago se hizo, no cómo se calculó.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Mostrando 1–2 de 2 pagos")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Registrar pago" }),
    ).toBeVisible();
    expect(reads[0]?.get("page")).toBe("1");
    expect(reads[0]?.has("staffMemberId")).toBe(false);
    expect(reads[0]?.has("branchId")).toBe(false);
  });

  it("filters by one Staff Member, deactivated ones included, in the address", async () => {
    server.use(
      payrollTable((params) =>
        jsonResponse(
          salaryPage(
            params.get("staffMemberId") === emma.id
              ? [emmaSeptember]
              : [emmaSeptember, camilaSeptember],
          ),
        ),
      ),
    );
    const { router, user } = renderAdmin("/dinero/sueldos/pagados");
    await rowOf("Camila Rojas");

    const filter = screen.getByLabelText("Empleado");
    expect(
      within(filter)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Todos",
      "Camila Rojas",
      "Emma Vargas",
      "Paola Mendoza",
      "Rita Salas (cuenta desactivada)",
    ]);
    await user.selectOptions(filter, emma.id);

    await screen.findByText("Mostrando 1–1 de 1 pago");
    expect(screen.queryByRole("cell", { name: /Camila Rojas/ })).toBeNull();
    expect(reads.at(-1)?.get("staffMemberId")).toBe(emma.id);
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      staffMemberId: emma.id,
    });
  });

  it("forgets a Staff Member the address names who is not in the list", async () => {
    server.use(
      payrollTable(() =>
        jsonResponse(salaryPage([emmaSeptember, camilaSeptember])),
      ),
    );
    const { router } = renderAdmin(
      "/dinero/sueldos/pagados?staffMemberId=5f000000-0000-5000-8000-000000000099&page=2",
    );
    await rowOf("Camila Rojas");

    await waitFor(() =>
      expect(router.state.matches.at(-1)?.search).toEqual({
        page: 1,
        pageSize: 20,
      }),
    );
    expect(screen.getByLabelText("Empleado")).toHaveValue("all");
    expect(reads.at(-1)?.has("staffMemberId")).toBe(false);
  });

  it("is studio-wide: «Todo el estudio» instead of the Branch selector", async () => {
    server.use(payrollTable(() => jsonResponse(salaryPage([emmaSeptember]))));
    renderAdmin("/dinero/sueldos/pagados");
    await rowOf("Emma Vargas");

    expect(
      within(screen.getByRole("banner")).getByText("Todo el estudio"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Sucursal/ }),
    ).not.toBeInTheDocument();
  });

  it("says when nothing was recorded, for everyone or for one person", async () => {
    server.use(payrollTable(() => jsonResponse(salaryPage([]))));
    const { user } = renderAdmin("/dinero/sueldos/pagados");
    expect(
      await screen.findByText("Todavía no hay pagos registrados."),
    ).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Empleado"), rita.id);
    expect(
      await screen.findByText("No hay pagos registrados para esta persona."),
    ).toBeVisible();
  });

  it("offers a retry when the payroll cannot load", async () => {
    server.use(payrollTable(() => problemResponse(500, "unexpected_error")));
    renderAdmin("/dinero/sueldos/pagados");
    expect(
      await screen.findByText(
        "No pudimos cargar la nómina.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("hides the payroll and its action from someone who lost access", async () => {
    server.use(
      payrollTable(() => problemResponse(403, "back_office_access_denied")),
    );
    renderAdmin("/dinero/sueldos/pagados");
    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Registrar pago" }),
    ).not.toBeInTheDocument();
  });
});

describe("AW11 Nómina on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(payrollStaffHandler());
  });

  it("labels each card's cells", async () => {
    server.use(payrollTable(() => jsonResponse(salaryPage([emmaSeptember]))));
    renderAdmin("/dinero/sueldos/pagados");
    const row = await rowOf("Emma Vargas");
    expect(
      within(row).getByRole("cell", { name: "20/09/2026" }),
    ).toHaveAttribute("data-label", "Fecha");
  });
});
