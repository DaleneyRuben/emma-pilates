import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  boliviaInstant,
  boliviaToday,
  weekStartOf,
} from "../../lib/bolivia-time";
import { activeBranchesHandler, equipetrol } from "../../test/booking-handlers";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  andreaFirst,
  danielaFollowUp,
  evaluationPage,
  evaluationsPath,
  lorena,
  veronica,
} from "../../test/oversight-fixtures";
import { staffMembersPath, staffPage } from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const reads: URLSearchParams[] = [];
const staffReads: URLSearchParams[] = [];
const evaluationTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(evaluationsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });
const nutritionists = () =>
  http.get(apiUrl(staffMembersPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    staffReads.push(params);
    return jsonResponse({ ...staffPage([veronica, lorena]), pageSize: 100 });
  });

const path = "/back-office/evaluaciones-nutricionales";
const september21 = `${path}?week=2026-09-21`;
const heading = () =>
  screen.findByRole("heading", {
    level: 1,
    name: "Evaluaciones nutricionales",
  });

describe("AW25 Evaluaciones nutricionales on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    staffReads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists the selected Branch's booked Evaluations of the week read-only", async () => {
    server.use(
      evaluationTable(() =>
        jsonResponse(evaluationPage([andreaFirst, danielaFollowUp])),
      ),
      nutritionists(),
    );
    const { user } = renderAdmin(september21);
    await heading();

    expect(screen.getByText("Cargando evaluaciones…")).toBeInTheDocument();
    const row = (await screen.findByRole("cell", { name: /Andrea Céspedes/ }))
      .parentElement as HTMLElement;
    expect(within(row).getByText("Primera evaluación")).toBeInTheDocument();
    expect(
      within(row).getByRole("cell", { name: "Verónica Zambrana" }),
    ).toHaveAttribute("data-label", "Nutricionista");
    expect(
      within(row).getByRole("cell", { name: "lun 21/09 · 09:00" }),
    ).toHaveAttribute("data-label", "Fecha y hora");
    const followUp = screen.getByRole("cell", { name: /Daniela Rojas Peña/ })
      .parentElement as HTMLElement;
    expect(within(followUp).getByText("Seguimiento")).toBeInTheDocument();
    expect(
      within(followUp).getByRole("cell", { name: "jue 24/09 · 16:30" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sucursal Centro · 2 evaluaciones agendadas"),
    ).toBeVisible();
    expect(screen.getByText("21 – 27 de septiembre de 2026")).toBeVisible();
    expect(screen.getByText("Mostrando 1–2 de 2 evaluaciones")).toBeVisible();
    expect(screen.queryByRole("columnheader", { name: "Estado" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Nuevo/ })).toBeNull();

    await user.click(within(row).getByText("Andrea Céspedes"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(Object.fromEntries(reads[0] ?? [])).toEqual({
      branchId: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c001",
      from: "2026-09-21T04:00:00.000Z",
      until: "2026-09-28T04:00:00.000Z",
      page: "1",
      pageSize: "20",
    });
  });

  it("opens on the current Bolivia week", async () => {
    server.use(
      evaluationTable(() => jsonResponse(evaluationPage([]))),
      nutritionists(),
    );
    renderAdmin(path);
    await heading();

    await waitFor(() => expect(reads).toHaveLength(1));
    expect(reads[0]?.get("from")).toBe(
      boliviaInstant(weekStartOf(boliviaToday()), "00:00"),
    );
  });

  it("walks the weeks and keeps the week in the address", async () => {
    server.use(
      evaluationTable(() => jsonResponse(evaluationPage([andreaFirst]))),
      nutritionists(),
    );
    const { router, user } = renderAdmin(`${september21}&page=2`);
    await screen.findByRole("cell", { name: /Andrea Céspedes/ });

    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));

    await waitFor(() =>
      expect(reads.at(-1)?.get("from")).toBe("2026-09-28T04:00:00.000Z"),
    );
    expect(reads.at(-1)?.get("page")).toBe("1");
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      week: "2026-09-28",
    });
    expect(screen.getByText("28 de septiembre – 4 de octubre de 2026"));
  });

  it("filters by one of the Branch's Nutritionists", async () => {
    server.use(
      evaluationTable((params) =>
        jsonResponse(
          evaluationPage(
            params.get("nutritionistStaffMemberId") === lorena.id
              ? [danielaFollowUp]
              : [andreaFirst, danielaFollowUp],
          ),
        ),
      ),
      nutritionists(),
    );
    const { router, user } = renderAdmin(september21);
    await screen.findByRole("cell", { name: /Andrea Céspedes/ });
    const filter = screen.getByRole("combobox", { name: "Nutricionista" });
    await waitFor(() =>
      expect(
        within(filter).getByRole("option", {
          name: "Lorena Iriarte (cuenta desactivada)",
        }),
      ).toBeInTheDocument(),
    );
    expect(within(filter).getAllByRole("option")[0]).toHaveTextContent("Todas");
    expect(Object.fromEntries(staffReads[0] ?? [])).toMatchObject({
      role: "nutritionist",
      branchId: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c001",
    });

    await user.selectOptions(filter, lorena.id);

    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: /Andrea Céspedes/ }),
      ).not.toBeInTheDocument(),
    );
    expect(reads.at(-1)?.get("nutritionistStaffMemberId")).toBe(lorena.id);
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      nutritionistStaffMemberId: lorena.id,
      page: 1,
    });
  });

  it("says when the week has no Evaluations, and how to widen a filtered one", async () => {
    server.use(
      evaluationTable(() => jsonResponse(evaluationPage([]))),
      nutritionists(),
    );
    renderAdmin(`${september21}&nutritionistStaffMemberId=${lorena.id}`);

    const table = await screen.findByRole("table");
    expect(
      await within(table).findByText("Sin evaluaciones en este rango."),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(
        "Prueba con otra semana o quita el filtro de nutricionista.",
      ),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Nutricionista" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sucursal Centro · ninguna evaluación agendada"),
    ).toBeVisible();
    expect(screen.getByText("Sin resultados")).toBeVisible();
  });

  it("follows the Branch selector and never shows another Branch's Evaluations", async () => {
    server.use(
      evaluationTable((params) =>
        jsonResponse(
          evaluationPage(
            params.get("branchId") === equipetrol.id ? [] : [andreaFirst],
          ),
        ),
      ),
      nutritionists(),
    );
    const { user } = renderAdmin(september21);
    await screen.findByRole("cell", { name: /Andrea Céspedes/ });

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );

    expect(
      await screen.findByText(
        "Sucursal Equipetrol · ninguna evaluación agendada",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("cell", { name: /Andrea Céspedes/ })).toBeNull();
    expect(reads.at(-1)?.get("branchId")).toBe(equipetrol.id);
    expect(staffReads.at(-1)?.get("branchId")).toBe(equipetrol.id);
  });

  it("drops a Nutritionist filter the new Branch does not know when the selector changes", async () => {
    // Lorena works at Centro only; Equipetrol's list must not stay filtered
    // by her after the switch.
    server.use(
      evaluationTable(() => jsonResponse(evaluationPage([]))),
      http.get(apiUrl(staffMembersPath), ({ request }) => {
        const params = new URL(request.url).searchParams;
        staffReads.push(params);
        return jsonResponse({
          ...staffPage(
            params.get("branchId") === equipetrol.id ? [] : [veronica, lorena],
          ),
          pageSize: 100,
        });
      }),
    );
    const { router, user } = renderAdmin(
      `${september21}&nutritionistStaffMemberId=${lorena.id}`,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Nutricionista" }),
      ).toHaveValue(lorena.id),
    );

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );

    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        week: "2026-09-21",
        page: 1,
        pageSize: 20,
      }),
    );
    expect(screen.getByRole("combobox", { name: "Nutricionista" })).toHaveValue(
      "all",
    );
    expect(reads.at(-1)?.get("branchId")).toBe(equipetrol.id);
    expect(reads.at(-1)?.has("nutritionistStaffMemberId")).toBe(false);
  });

  it("offers a retry when the list cannot load", async () => {
    server.use(
      evaluationTable(() => problemResponse(500, "unexpected_error")),
      nutritionists(),
    );
    renderAdmin(september21);

    expect(
      await screen.findByText(
        "No pudimos cargar las evaluaciones.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      evaluationTable(() =>
        problemResponse(403, "administration_access_denied"),
      ),
      nutritionists(),
    );
    renderAdmin(september21);

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
  });

  it("says so when the studio has no active Branch yet", async () => {
    server.use(activeBranchesHandler([]));
    renderAdmin(september21);
    await heading();

    expect(
      await screen.findByText(
        "Todavía no hay sucursales activas. Las evaluaciones se ven por sucursal.",
      ),
    ).toBeInTheDocument();
    expect(reads).toHaveLength(0);
  });
});

describe("AW25 Evaluaciones nutricionales on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the week above one labelled card per Evaluation", async () => {
    server.use(
      evaluationTable(() => jsonResponse(evaluationPage([andreaFirst]))),
      nutritionists(),
    );
    renderAdmin(september21);

    const moment = await screen.findByRole("cell", {
      name: "lun 21/09 · 09:00",
    });
    expect(moment).toHaveAttribute("data-label", "Fecha y hora");
    expect(
      screen.getByRole("button", { name: "Semana anterior" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Nutricionista" }),
    ).toBeVisible();
  });
});
