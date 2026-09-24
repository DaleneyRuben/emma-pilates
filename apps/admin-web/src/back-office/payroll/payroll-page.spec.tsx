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
    renderAdmin("/back-office/nomina");
    await heading();

    expect(screen.getByText("Cargando pagos…")).toBeInTheDocument();
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
    const { router, user } = renderAdmin("/back-office/nomina");
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
      "/back-office/nomina?staffMemberId=5f000000-0000-5000-8000-000000000099&page=2",
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

  it("stays the same list whichever Branch the selector names", async () => {
    server.use(payrollTable(() => jsonResponse(salaryPage([emmaSeptember]))));
    const { user } = renderAdmin("/back-office/nomina");
    await rowOf("Emma Vargas");
    const before = reads.length;

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    const popover = await screen.findByRole("dialog", { name: "Sucursal" });
    expect(
      within(popover).getByText(
        "Esta página no se filtra por sucursal — la nómina es del estudio, no de una sede.",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(popover).getByRole("option", { name: /Equipetrol/ }),
    );

    expect(await rowOf("Emma Vargas")).toBeVisible();
    expect(reads).toHaveLength(before);
  });

  it("says when nothing was recorded, for everyone or for one person", async () => {
    server.use(payrollTable(() => jsonResponse(salaryPage([]))));
    const { user } = renderAdmin("/back-office/nomina");
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
    renderAdmin("/back-office/nomina");
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
    renderAdmin("/back-office/nomina");
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
    renderAdmin("/back-office/nomina");
    const row = await rowOf("Emma Vargas");
    expect(
      within(row).getByRole("cell", { name: "20/09/2026" }),
    ).toHaveAttribute("data-label", "Fecha");
  });
});
