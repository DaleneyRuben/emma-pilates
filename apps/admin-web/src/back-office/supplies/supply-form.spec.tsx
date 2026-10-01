import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  detergent,
  paper,
  suppliesPath,
  supplyPage,
  supplyRow,
} from "../../test/back-office-fixtures";
import { centro } from "../../test/booking-handlers";
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

let tableReads = 0;
const supplyTable = (rows = () => [detergent, paper]) =>
  http.get(apiUrl(suppliesPath), ({ request }) => {
    if (new URL(request.url).searchParams.get("pageSize") === "100") {
      return undefined;
    }
    tableReads += 1;
    return jsonResponse(supplyPage(rows()));
  });

const openCreate = async () => {
  const rendered = renderAdmin("/back-office/insumos");
  await screen.findByRole("cell", { name: "Detergente" });
  await rendered.user.click(
    screen.getByRole("button", { name: "Nuevo insumo" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Nuevo insumo" });
  return { ...rendered, panel };
};

const openEdit = async (name = "Papel higiénico") => {
  const rendered = renderAdmin("/back-office/insumos");
  await rendered.user.click(await screen.findByRole("button", { name }));
  const panel = await screen.findByRole("dialog", { name: "Editar insumo" });
  return { ...rendered, panel };
};

describe("AW09 Supply form on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    tableReads = 0;
    server.use(...signedInHandlers());
  });

  it("creates a Supply at the selected Branch after validating it", async () => {
    let created: unknown;
    server.use(
      supplyTable(() =>
        created === undefined
          ? [detergent, paper]
          : [detergent, paper, supplyRow("07", "Toallas")],
      ),
      http.post(apiUrl(suppliesPath), async ({ request }) => {
        created = await request.json();
        return jsonResponse(supplyRow("07", "Toallas"), 201);
      }),
    );
    const { panel, user } = await openCreate();
    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(panel).getByLabelText("Cantidad en stock"),
    ).toHaveAccessibleDescription(
      "Solo al crearlo: después cambia con retiros y reposiciones.",
    );

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(within(panel).getByLabelText("Nombre")).toHaveAccessibleDescription(
      "Escribe el nombre.",
    );
    expect(
      within(panel).getByLabelText("Umbral de alerta"),
    ).toHaveAccessibleDescription(
      expect.stringContaining("Escribe un número entero desde 0."),
    );

    await user.type(within(panel).getByLabelText("Nombre"), " Toallas ");
    await user.type(within(panel).getByLabelText("Cantidad en stock"), "12");
    await user.type(within(panel).getByLabelText("Umbral de alerta"), "4");
    const readsBefore = tableReads;
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText("Insumo «Toallas» creado con 12 unid."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Nuevo insumo" }),
    ).not.toBeInTheDocument();
    expect(created).toEqual({
      branchId: centro.id,
      name: "Toallas",
      initialQuantity: 12,
      lowStockThreshold: 4,
    });
    expect(await screen.findByRole("cell", { name: "Toallas" })).toBeVisible();
    expect(tableReads).toBeGreaterThan(readsBefore);
  });

  it("marks a name another active Supply of the Branch already uses", async () => {
    server.use(
      supplyTable(),
      http.post(apiUrl(suppliesPath), () =>
        problemResponse(409, "supply_name_taken"),
      ),
    );
    const { panel, user } = await openCreate();
    await user.type(within(panel).getByLabelText("Nombre"), "detergente");
    await user.type(within(panel).getByLabelText("Cantidad en stock"), "1");
    await user.type(within(panel).getByLabelText("Umbral de alerta"), "0");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(
        within(panel).getByLabelText("Nombre"),
      ).toHaveAccessibleDescription(
        "Ya hay un insumo activo con ese nombre en esta sucursal.",
      ),
    );
    expect(within(panel).getByLabelText("Nombre")).toHaveValue("detergente");
  });

  it("edits the name and threshold while the stock stays read-only", async () => {
    let updated: unknown;
    server.use(
      supplyTable(),
      http.put(apiUrl(`${suppliesPath}/${paper.id}`), async ({ request }) => {
        updated = await request.json();
        return jsonResponse({
          ...paper,
          lowStockThreshold: 1,
          lowStock: false,
        });
      }),
    );
    const { panel, user } = await openEdit();
    expect(within(panel).getByLabelText("Nombre")).toHaveValue(
      "Papel higiénico",
    );
    expect(
      within(panel).queryByRole("textbox", { name: "Cantidad en stock" }),
    ).not.toBeInTheDocument();
    expect(within(panel).getByText("2 unid.")).toBeInTheDocument();
    expect(
      within(panel).getByText(
        "Cambia solo con «Registrar retiro» y «Registrar reposición».",
      ),
    ).toBeInTheDocument();

    await user.clear(within(panel).getByLabelText("Umbral de alerta"));
    await user.type(within(panel).getByLabelText("Umbral de alerta"), "1");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText("Guardamos los cambios de Papel higiénico."),
    ).toBeInTheDocument();
    expect(updated).toEqual({ name: "Papel higiénico", lowStockThreshold: 1 });
  });

  it("closes without a request when nothing changed", async () => {
    const puts: unknown[] = [];
    server.use(
      supplyTable(),
      http.put(apiUrl(`${suppliesPath}/${paper.id}`), ({ request }) => {
        puts.push(request.url);
        return jsonResponse(paper);
      }),
    );
    const { panel, user } = await openEdit();
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar insumo" }),
      ).not.toBeInTheDocument(),
    );
    expect(puts).toEqual([]);
  });

  it("archives a Supply after the confirmation follow-up 49 draws", async () => {
    let archived = false;
    server.use(
      supplyTable(() => (archived ? [detergent] : [detergent, paper])),
      http.post(apiUrl(`${suppliesPath}/${paper.id}/archive`), () => {
        archived = true;
        return jsonResponse({ ...paper, archivedAt: "2026-09-24T15:00:00Z" });
      }),
    );
    const { panel, user } = await openEdit();
    await user.click(
      within(panel).getByRole("button", { name: "Archivar insumo" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Archivar este insumo?",
    });
    expect(
      within(dialog).getByText(
        "Dejará de aparecer en Insumos y en Registrar retiro. Sus retiros seguirán en «Retiros e insumos consumidos».",
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Archivar" }));

    expect(
      await screen.findByText(
        "Papel higiénico se archivó: sus retiros siguen en el historial.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: "Papel higiénico" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("goes back from the archive confirmation with Volver (59 §8)", async () => {
    server.use(supplyTable());
    const { panel, user } = await openEdit();
    await user.click(
      within(panel).getByRole("button", { name: "Archivar insumo" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Volver" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Editar insumo" })).toBeVisible();
  });

  it("explains a Supply archived or removed elsewhere", async () => {
    server.use(
      supplyTable(),
      http.put(apiUrl(`${suppliesPath}/${paper.id}`), () =>
        problemResponse(409, "supply_archived"),
      ),
    );
    const { panel, user } = await openEdit();
    await user.type(within(panel).getByLabelText("Nombre"), " XL");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText(
        "Este insumo ya está archivado. Cierra el panel para ver la lista actual.",
      ),
    ).toBeInTheDocument();
  });
});

describe("AW09 Supply form on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("fills the screen and keeps a failed save's values", async () => {
    server.use(
      supplyTable(),
      http.post(apiUrl(suppliesPath), () => HttpResponse.error()),
    );
    const { panel, user } = await openCreate();
    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    await user.type(within(panel).getByLabelText("Nombre"), "Toallas");
    await user.type(within(panel).getByLabelText("Cantidad en stock"), "5");
    await user.type(within(panel).getByLabelText("Umbral de alerta"), "1");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText("No pudimos guardar. Inténtalo de nuevo."),
    ).toBeInTheDocument();
    expect(within(panel).getByLabelText("Nombre")).toHaveValue("Toallas");
  });
});
