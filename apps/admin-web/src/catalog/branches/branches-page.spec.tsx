import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  branchesPath,
  centro,
  equipetrol,
  page,
} from "../../test/booking-handlers";
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

const antigua = {
  id: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c009",
  name: "Antigua",
  address: "Calle Cerrada 1",
  archivedAt: "2026-09-01T12:00:00.000Z",
};

// The table's own read (page size 20 by default); the selector's read of
// every active Branch (page size 100) is answered by signedInHandlers.
const tableReads: URLSearchParams[] = [];
const branchTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(branchesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("pageSize") === "100") return undefined;
    tableReads.push(params);
    return respond(params);
  });

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Sucursales" });

describe("AW19 Sucursales on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    tableReads.length = 0;
    server.use(...signedInHandlers());
  });

  it("shows loading, then the Branches with their addresses", async () => {
    server.use(branchTable(() => jsonResponse(page([centro, equipetrol]))));
    renderAdmin("/catalogo/sucursales");
    await heading();

    expect(screen.getByText("Cargando sucursales…")).toBeInTheDocument();
    const row = (await screen.findByRole("cell", { name: "Equipetrol" }))
      .parentElement as HTMLElement;
    expect(
      within(row).getByRole("cell", { name: "Av. San Martín 1120" }),
    ).toHaveAttribute("data-label", "Dirección");
    expect(screen.getByText("Mostrando 1–2 de 2")).toBeInTheDocument();
    expect(tableReads[0]?.get("status")).toBe("active");
    expect(tableReads[0]?.get("page")).toBe("1");
  });

  it("keeps the page and the status filter in the address", async () => {
    server.use(
      branchTable((params) =>
        jsonResponse(
          params.get("status") === "archived"
            ? page([antigua])
            : page([centro], {
                page: Number(params.get("page")),
                totalItems: 21,
              }),
        ),
      ),
    );
    const { router, user } = renderAdmin("/catalogo/sucursales?page=2");
    await screen.findByRole("cell", { name: "Centro" });
    expect(tableReads.at(-1)?.get("page")).toBe("2");

    await user.selectOptions(screen.getByLabelText("Estado"), "archived");

    expect(await screen.findByRole("cell", { name: /Antigua/ })).toBeVisible();
    expect(screen.getByText("Archivada")).toBeInTheDocument();
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      status: "archived",
    });
  });

  it("says when no Branch matches and when the table cannot load", async () => {
    server.use(branchTable(() => jsonResponse(page([]))));
    const { user } = renderAdmin("/catalogo/sucursales");
    expect(
      await screen.findByText("No hay sucursales con este filtro."),
    ).toBeInTheDocument();

    server.use(branchTable(() => problemResponse(500, "unexpected_error")));
    await user.selectOptions(screen.getByLabelText("Estado"), "all");
    // A 5xx is retried once before the page gives up (query-client.ts).
    expect(
      await screen.findByText(
        "No pudimos cargar las sucursales.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      branchTable(() => problemResponse(403, "administration_access_denied")),
    );
    renderAdmin("/catalogo/sucursales");
    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nueva sucursal" }),
    ).not.toBeInTheDocument();
  });

  it("creates a Branch in the side panel after validating it and refreshes the lists", async () => {
    let created: unknown;
    server.use(
      branchTable(() =>
        jsonResponse(page(created ? [centro, norteBranch] : [centro])),
      ),
      http.post(apiUrl(branchesPath), async ({ request }) => {
        created = await request.json();
        return jsonResponse(norteBranch, 201);
      }),
    );
    const { user } = renderAdmin("/catalogo/sucursales");
    await screen.findByRole("cell", { name: "Centro" });

    await user.click(screen.getByRole("button", { name: "Nueva sucursal" }));
    const panel = await screen.findByRole("dialog", { name: "Nueva sucursal" });
    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(panel).getByText(
        "Aparecerá en el selector de sucursal al guardarla.",
      ),
    ).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(within(panel).getByLabelText("Nombre")).toHaveAccessibleDescription(
      expect.stringContaining("Escribe el nombre."),
    );

    await user.type(within(panel).getByLabelText("Nombre"), " Norte ");
    await user.type(
      within(panel).getByLabelText("Dirección"),
      "Av. Banzer, 4.º anillo",
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Nueva sucursal" }),
      ).not.toBeInTheDocument(),
    );
    expect(created).toEqual({
      name: "Norte",
      address: "Av. Banzer, 4.º anillo",
    });
    expect(await screen.findByRole("cell", { name: "Norte" })).toBeVisible();
  });

  it("edits a Branch from its row and explains that renaming moves nothing", async () => {
    let updated: unknown;
    server.use(
      branchTable(() => jsonResponse(page([centro]))),
      http.put(apiUrl(`${branchesPath}/${centro.id}`), async ({ request }) => {
        updated = await request.json();
        return jsonResponse({ ...centro, name: "Centro histórico" });
      }),
    );
    const { user } = renderAdmin("/catalogo/sucursales");

    await user.click(await screen.findByRole("button", { name: "Centro" }));
    const panel = await screen.findByRole("dialog", {
      name: "Editar sucursal",
    });
    expect(within(panel).getByLabelText("Nombre")).toHaveValue("Centro");
    expect(
      within(panel).getByText(/renombrarla no mueve esos datos/),
    ).toBeInTheDocument();

    await user.clear(within(panel).getByLabelText("Nombre"));
    await user.type(within(panel).getByLabelText("Nombre"), "Centro histórico");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(updated).toEqual({
        name: "Centro histórico",
        address: "Calle Ayacucho 245",
      }),
    );
  });

  it("archives an idle Branch after confirming and explains a refusal by its code", async () => {
    let archiveCalls = 0;
    server.use(
      branchTable(() => jsonResponse(page([centro]))),
      http.post(apiUrl(`${branchesPath}/${centro.id}/archive`), () => {
        archiveCalls += 1;
        return archiveCalls === 1
          ? problemResponse(409, "branch_in_use")
          : jsonResponse({ ...centro, archivedAt: "2026-09-23T12:00:00.000Z" });
      }),
    );
    const { user } = renderAdmin("/catalogo/sucursales");
    await user.click(await screen.findByRole("button", { name: "Centro" }));
    const panel = await screen.findByRole("dialog", {
      name: "Editar sucursal",
    });

    await user.click(
      within(panel).getByRole("button", { name: "Archivar sucursal" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Archivar Centro?",
    });
    await user.click(within(confirm).getByRole("button", { name: "Archivar" }));

    expect(
      await within(panel).findByText(
        "No puedes archivarla: tiene sesiones programadas o un horario semanal vigente.",
      ),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", { name: "Archivar sucursal" }),
    );
    await user.click(
      within(
        await screen.findByRole("alertdialog", { name: "¿Archivar Centro?" }),
      ).getByRole("button", { name: "Archivar" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar sucursal" }),
      ).not.toBeInTheDocument(),
    );
    expect(archiveCalls).toBe(2);
  });
});

const norteBranch = {
  id: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c003",
  name: "Norte",
  address: "Av. Banzer, 4.º anillo",
  archivedAt: null,
};

describe("AW19 Sucursales on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("opens the Branch form as a full-screen sheet", async () => {
    server.use(branchTable(() => jsonResponse(page([centro]))));
    const { user } = renderAdmin("/catalogo/sucursales");
    await screen.findByRole("cell", { name: "Centro" });

    await user.click(screen.getByRole("button", { name: "Nueva sucursal" }));
    expect(
      await screen.findByRole("dialog", { name: "Nueva sucursal" }),
    ).toHaveAttribute("data-presentation", "full-screen");
  });

  it("keeps a failed save's values and says what went wrong", async () => {
    server.use(
      branchTable(() => jsonResponse(page([centro]))),
      http.post(apiUrl(branchesPath), () => HttpResponse.error()),
    );
    const { user } = renderAdmin("/catalogo/sucursales");
    await screen.findByRole("cell", { name: "Centro" });
    await user.click(screen.getByRole("button", { name: "Nueva sucursal" }));
    const panel = await screen.findByRole("dialog", { name: "Nueva sucursal" });

    await user.type(within(panel).getByLabelText("Nombre"), "Norte");
    await user.type(within(panel).getByLabelText("Dirección"), "Av. Banzer");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText("No pudimos guardar. Inténtalo de nuevo."),
    ).toBeInTheDocument();
    expect(within(panel).getByLabelText("Nombre")).toHaveValue("Norte");
  });
});
