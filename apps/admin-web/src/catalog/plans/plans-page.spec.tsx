import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { page } from "../../test/booking-handlers";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const plansPath = "/api/v1/administrator/plans";

// BKM-005: Plans last 30, 60, or 90 days; the long ones may cap the week.
const mensual = {
  id: "7a1b2c3d-0000-5000-8000-000000000003",
  name: "Bimestral 16 clases",
  durationDays: 60,
  weeklyClassCap: 3,
  durationMonths: 2,
  classAllowance: 16,
  priceCentavos: 112_000,
  displayOrder: 3,
  hiddenAt: null,
};
const anual = {
  id: "7a1b2c3d-0000-5000-8000-000000000006",
  name: "Paquete de 12 clases",
  durationDays: 30,
  weeklyClassCap: null,
  durationMonths: 1,
  classAllowance: 12,
  priceCentavos: 78_000,
  displayOrder: 6,
  hiddenAt: "2026-09-20T12:00:00.000Z",
};

const reads: URLSearchParams[] = [];
const planTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(plansPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const openNewPlan = async (user: ReturnType<typeof renderAdmin>["user"]) => {
  await screen.findByRole("cell", { name: /Bimestral 16 clases/ });
  await user.click(screen.getByRole("button", { name: "Nuevo plan" }));
  return screen.findByRole("dialog", { name: "Nuevo plan" });
};

describe("AW04 Planes on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists Plans with a fixed class count, their validity in days, the Weekly Cap, and the price in BOB", async () => {
    server.use(planTable(() => jsonResponse(page([mensual, anual]))));
    renderAdmin("/catalogo/planes");

    expect(await screen.findByText("Cargando planes…")).toBeInTheDocument();
    const row = (
      await screen.findByRole("cell", { name: /Paquete de 12 clases/ })
    ).parentElement as HTMLElement;
    expect(within(row).getByRole("cell", { name: "30 días" })).toHaveAttribute(
      "data-label",
      "Vigencia",
    );
    expect(within(row).getByRole("cell", { name: "Sin tope" })).toHaveAttribute(
      "data-label",
      "Tope semanal",
    );
    expect(
      within(row).getByRole("cell", { name: "12 clases" }),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole("cell", { name: "Bs 780,00" }),
    ).toBeInTheDocument();
    expect(within(row).getByText("Oculto")).toBeInTheDocument();
    const capped = screen.getByRole("cell", { name: /Bimestral 16 clases/ })
      .parentElement as HTMLElement;
    expect(within(capped).getByRole("cell", { name: "60 días" })).toBeVisible();
    expect(
      within(capped).getByRole("cell", { name: "3 por semana" }),
    ).toBeVisible();
    expect(within(capped).getByText("Visible")).toBeInTheDocument();
    expect(screen.queryByText(/\bmes(es)?\b/)).not.toBeInTheDocument();
    expect(reads[0]?.get("visibility")).toBe("all");
  });

  it("filters by visibility from the address and says when nothing matches", async () => {
    server.use(
      planTable((params) =>
        jsonResponse(
          params.get("visibility") === "hidden" ? page([]) : page([mensual]),
        ),
      ),
    );
    const { router, user } = renderAdmin("/catalogo/planes");
    await screen.findByRole("cell", { name: /Bimestral 16 clases/ });

    await user.selectOptions(screen.getByLabelText("Visibilidad"), "hidden");

    expect(
      await screen.findByText("No hay planes con este filtro."),
    ).toBeInTheDocument();
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      visibility: "hidden",
    });
  });

  it("shows a failed read with a retry", async () => {
    server.use(planTable(() => problemResponse(404, "not_found")));
    renderAdmin("/catalogo/planes");
    expect(
      await screen.findByText("No pudimos cargar los planes."),
    ).toBeInTheDocument();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      planTable(() => problemResponse(403, "administration_access_denied")),
    );
    renderAdmin("/catalogo/planes");

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nuevo plan" }),
    ).not.toBeInTheDocument();
  });

  it("creates a Plan of 30, 60, or 90 days with an optional Weekly Cap and the price in centavos", async () => {
    let body: unknown;
    server.use(
      planTable(() => jsonResponse(page([mensual]))),
      http.post(apiUrl(plansPath), async ({ request }) => {
        body = await request.json();
        return jsonResponse({ ...mensual, id: "new" }, 201);
      }),
    );
    const { user } = renderAdmin("/catalogo/planes");
    const panel = await openNewPlan(user);

    expect(
      within(within(panel).getByLabelText("Vigencia"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["30 días", "60 días", "90 días"]);
    expect(
      within(within(panel).getByLabelText("Tope semanal"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Sin tope", "3 clases por semana", "4 clases por semana"]);
    // 30-day Plans have no cap (booking ADR-0006).
    expect(within(panel).getByLabelText("Tope semanal")).toBeDisabled();
    await user.type(
      within(panel).getByLabelText("Nombre"),
      "Trimestral 36 clases",
    );
    await user.selectOptions(within(panel).getByLabelText("Vigencia"), "90");
    expect(within(panel).getByLabelText("Tope semanal")).toBeEnabled();
    await user.selectOptions(within(panel).getByLabelText("Tope semanal"), "4");
    await user.type(within(panel).getByLabelText("Clases incluidas"), "36");
    await user.type(within(panel).getByLabelText("Precio"), "dos mil");
    await user.type(within(panel).getByLabelText("Orden en la app"), "4");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(within(panel).getByLabelText("Precio")).toHaveAccessibleDescription(
      expect.stringContaining("Escribe un monto como 1.050,00."),
    );

    await user.clear(within(panel).getByLabelText("Precio"));
    await user.type(within(panel).getByLabelText("Precio"), "2.100,00");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        name: "Trimestral 36 clases",
        durationDays: 90,
        weeklyClassCap: 4,
        classAllowance: 36,
        priceCentavos: 210_000,
        displayOrder: 4,
      }),
    );
  });

  it("edits a Plan with its current price and keeps what Clients already bought", async () => {
    let body: unknown;
    server.use(
      planTable(() => jsonResponse(page([mensual]))),
      http.put(apiUrl(`${plansPath}/${mensual.id}`), async ({ request }) => {
        body = await request.json();
        return jsonResponse(mensual);
      }),
    );
    const { user } = renderAdmin("/catalogo/planes");
    await user.click(
      await screen.findByRole("button", { name: "Bimestral 16 clases" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar plan" });

    expect(within(panel).getByLabelText("Precio")).toHaveValue("1.120,00");
    expect(within(panel).getByLabelText("Vigencia")).toHaveValue("60");
    expect(within(panel).getByLabelText("Tope semanal")).toHaveValue("3");
    expect(
      within(panel).getByText(
        "Las suscripciones vigentes y las compras ya iniciadas conservan su precio.",
      ),
    ).toBeInTheDocument();

    await user.clear(within(panel).getByLabelText("Precio"));
    await user.type(within(panel).getByLabelText("Precio"), "1100");
    // Back to 30 days drops the cap, which only 60- and 90-day Plans carry.
    await user.selectOptions(within(panel).getByLabelText("Vigencia"), "30");
    expect(within(panel).getByLabelText("Tope semanal")).toHaveValue("");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        name: "Bimestral 16 clases",
        durationDays: 30,
        weeklyClassCap: null,
        classAllowance: 16,
        priceCentavos: 110_000,
        displayOrder: 3,
      }),
    );
  });

  it("hides a visible Plan from the Client catalog and shows a hidden one again", async () => {
    const bodies: unknown[] = [];
    server.use(
      planTable(() => jsonResponse(page([mensual, anual]))),
      http.put(
        apiUrl(`${plansPath}/:planId/visibility`),
        async ({ request }) => {
          bodies.push(await request.json());
          return jsonResponse(mensual);
        },
      ),
    );
    const { user } = renderAdmin("/catalogo/planes");

    await user.click(
      await screen.findByRole("button", { name: "Bimestral 16 clases" }),
    );
    let panel = await screen.findByRole("dialog", { name: "Editar plan" });
    await user.click(
      within(panel).getByRole("button", { name: "Ocultar en la app" }),
    );
    await waitFor(() => expect(bodies).toEqual([{ visible: false }]));

    await user.click(
      await screen.findByRole("button", { name: "Paquete de 12 clases" }),
    );
    panel = await screen.findByRole("dialog", { name: "Editar plan" });
    await user.click(
      within(panel).getByRole("button", { name: "Mostrar en la app" }),
    );
    await waitFor(() =>
      expect(bodies).toEqual([{ visible: false }, { visible: true }]),
    );
  });
});

describe("AW04 Planes on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("opens the Plan form as a full-screen sheet and reports a refused save", async () => {
    server.use(
      planTable(() => jsonResponse(page([mensual]))),
      http.post(apiUrl(plansPath), () =>
        problemResponse(400, "invalid_catalog_value"),
      ),
    );
    const { user } = renderAdmin("/catalogo/planes");
    const panel = await openNewPlan(user);
    expect(panel).toHaveAttribute("data-presentation", "full-screen");

    await user.type(
      within(panel).getByLabelText("Nombre"),
      "Paquete de 8 clases",
    );
    await user.type(within(panel).getByLabelText("Clases incluidas"), "8");
    await user.type(within(panel).getByLabelText("Precio"), "560");
    await user.type(within(panel).getByLabelText("Orden en la app"), "1");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText(
        "Revisa los datos: hay un valor que no es válido.",
      ),
    ).toBeInTheDocument();
  });
});
