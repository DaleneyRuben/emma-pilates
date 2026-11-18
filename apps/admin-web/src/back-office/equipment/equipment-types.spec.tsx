import {
  getListEquipmentFlaggedSessionsQueryKey,
  getListEquipmentIssuesQueryKey,
  getListEquipmentQueryKey,
  getListEquipmentStocksQueryKey,
} from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { centro, norte } from "../../test/booking-handlers";
import {
  equipmentHandlers,
  equipmentTypesPath,
  matType,
  ringsType,
} from "../../test/equipment-fixtures";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const bodies: unknown[] = [];
const record =
  (method: "post" | "patch") => (path: string, respond: () => Response) =>
    http[method](apiUrl(path), async ({ request }) => {
      const text = await request.text();
      bodies.push(text === "" ? null : JSON.parse(text));
      return respond();
    });
const recordPost = record("post");
const recordPatch = record("patch");

const sectionOf = async (name: RegExp) =>
  (await screen.findByRole("region", { name })) as HTMLElement;

const openNewType = async () => {
  const { user } = renderAdmin("/estudio/equipos");
  await sectionOf(/^Reformer ·/);
  await user.click(screen.getByRole("button", { name: "Nuevo tipo" }));
  const panel = await screen.findByRole("dialog", { name: "Nuevo tipo" });
  return { user, panel };
};

const openEdit = async (section: RegExp, title: string) => {
  const { user, queryClient } = renderAdmin("/estudio/equipos");
  await user.click(
    within(await sectionOf(section)).getByRole("button", {
      name: "Editar tipo",
    }),
  );
  return {
    user,
    queryClient,
    panel: await screen.findByRole("dialog", { name: title }),
  };
};

// FIX-067 (finding 101, option A): the studio's own equipment types.
describe("AW37 equipment types", () => {
  useMockServer();
  beforeEach(() => {
    bodies.length = 0;
    server.use(...signedInHandlers());
  });

  it("creates a type kept by quantity with the Branch's starting count", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(equipmentTypesPath, () =>
        jsonResponse(
          {
            id: "e9000000-0000-5000-8000-000000000077",
            name: "Rodillos",
            tracking: "quantity",
            legacyKind: null,
          },
          201,
        ),
      ),
    );
    const { user, panel } = await openNewType();
    expect(
      within(panel).getByText(
        "El tipo es para todo el estudio. Cómo se lleva no se puede cambiar después.",
      ),
    ).toBeInTheDocument();
    await user.type(within(panel).getByLabelText("Nombre"), "  Rodillos ");
    await user.click(
      within(panel).getByRole("radio", { name: /^Por cantidad/ }),
    );
    await user.type(
      within(panel).getByLabelText("Cantidad en Sucursal Centro"),
      "6",
    );
    await user.click(within(panel).getByRole("button", { name: "Crear tipo" }));
    expect(await screen.findByText("Creamos el tipo Rodillos.")).toBeVisible();
    expect(bodies).toEqual([
      {
        name: "Rodillos",
        tracking: "quantity",
        branchId: centro.id,
        quantity: 6,
      },
    ]);
  });

  it("creates a type kept by unit and refuses a repeated name", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(equipmentTypesPath, () =>
        bodies.length === 1
          ? problemResponse(409, "equipment_type_name_taken")
          : jsonResponse(
              {
                id: "e9000000-0000-5000-8000-000000000078",
                name: "Silla",
                tracking: "unit",
                legacyKind: null,
              },
              201,
            ),
      ),
    );
    const { user, panel } = await openNewType();
    await user.click(
      within(panel).getByRole("radio", { name: /^Por unidad, con número/ }),
    );
    expect(
      within(panel).queryByLabelText(/Cantidad en Sucursal/),
    ).not.toBeInTheDocument();
    await user.type(within(panel).getByLabelText("Nombre"), "Mat");
    await user.click(within(panel).getByRole("button", { name: "Crear tipo" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Ya hay un tipo con ese nombre.",
    );
    await user.clear(within(panel).getByLabelText("Nombre"));
    await user.type(within(panel).getByLabelText("Nombre"), "Silla");
    await user.click(within(panel).getByRole("button", { name: "Crear tipo" }));
    expect(await screen.findByText("Creamos el tipo Silla.")).toBeVisible();
    expect(bodies.at(-1)).toEqual({ name: "Silla", tracking: "unit" });
  });

  it("asks for a name before creating", async () => {
    server.use(...equipmentHandlers());
    const { user, panel } = await openNewType();
    await user.click(within(panel).getByRole("button", { name: "Crear tipo" }));
    expect(within(panel).getByRole("alert")).toHaveTextContent(
      "Escribe un nombre.",
    );
    expect(bodies).toEqual([]);
  });

  it("renames a type", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPatch(`${equipmentTypesPath}/${ringsType.id}`, () =>
        jsonResponse({ ...ringsType, name: "Aros mágicos" }),
      ),
    );
    const { user, panel } = await openEdit(/^Aros ·/, "Editar tipo · Aros");
    expect(
      within(panel).getByText("Se lleva por cantidad. No se puede cambiar."),
    ).toBeInTheDocument();
    const name = within(panel).getByLabelText("Nombre");
    expect(name).toHaveValue("Aros");
    await user.clear(name);
    await user.type(name, "Aros mágicos");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Guardamos el tipo Aros mágicos."),
    ).toBeVisible();
    expect(bodies).toEqual([{ name: "Aros mágicos" }]);
  });

  it("refreshes every Branch's equipment after renaming a type", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPatch(`${equipmentTypesPath}/${ringsType.id}`, () =>
        jsonResponse({ ...ringsType, name: "Aros mágicos" }),
      ),
    );
    const { user, queryClient, panel } = await openEdit(
      /^Aros ·/,
      "Editar tipo · Aros",
    );
    const other = { branchId: norte.id };
    const keys = [
      getListEquipmentQueryKey(other),
      getListEquipmentStocksQueryKey(other),
      getListEquipmentIssuesQueryKey({ ...other, status: "open" }),
      getListEquipmentFlaggedSessionsQueryKey(other as never),
    ];
    keys.forEach((key) => queryClient.setQueryData(key, []));
    const name = within(panel).getByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "Aros mágicos");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Guardamos el tipo Aros mágicos."),
    ).toBeVisible();
    expect(
      keys.map((key) => queryClient.getQueryState(key)?.isInvalidated),
    ).toEqual([true, true, true, true]);
  });

  it("keeps Quitar tipo off while the type has units in this Branch", async () => {
    server.use(...equipmentHandlers());
    const { panel } = await openEdit(/^Reformer ·/, "Editar tipo · Reformer");
    expect(
      within(panel).getByRole("button", { name: "Quitar tipo" }),
    ).toBeDisabled();
    expect(
      within(panel).getByText(
        "Primero da de baja sus unidades en todas las sucursales.",
      ),
    ).toBeInTheDocument();
  });

  it("asks to empty a quantity type's count before removing it", async () => {
    server.use(...equipmentHandlers());
    const { panel } = await openEdit(/^Balones ·/, "Editar tipo · Balones");
    expect(
      within(panel).getByRole("button", { name: "Quitar tipo" }),
    ).toBeDisabled();
    expect(
      within(panel).getByText(
        "Primero deja su cantidad en 0 en todas las sucursales.",
      ),
    ).toBeInTheDocument();
  });

  it("explains the refusal for a quantity type another Branch still counts", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentTypesPath}/${ringsType.id}/archive`, () =>
        problemResponse(409, "equipment_type_in_use"),
      ),
    );
    const { user, panel } = await openEdit(/^Aros ·/, "Editar tipo · Aros");
    await user.click(
      within(panel).getByRole("button", { name: "Quitar tipo" }),
    );
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "¿Quitar el tipo Aros?",
        }),
      ).getByRole("button", { name: "Quitar tipo" }),
    );
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Primero deja su cantidad en 0 en todas las sucursales.",
    );
  });

  it("removes an unused type", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentTypesPath}/${ringsType.id}/archive`, () =>
        jsonResponse(ringsType),
      ),
    );
    const { user, panel } = await openEdit(/^Aros ·/, "Editar tipo · Aros");
    expect(
      within(panel).getByText(
        "Deja de aparecer en todas las sucursales. Su historial queda.",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(panel).getByRole("button", { name: "Quitar tipo" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Quitar el tipo Aros?",
    });
    expect(
      within(confirm).getByText(
        "Deja de aparecer en todas las sucursales. Su historial queda.",
      ),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
    const remove = within(confirm).getByRole("button", { name: "Quitar tipo" });
    await user.dblClick(remove);
    expect(await screen.findByText("Quitamos el tipo Aros.")).toBeVisible();
    expect(bodies).toEqual([null]);
  });

  it("explains the refusal when another Branch still uses the type", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentTypesPath}/${matType.id}/archive`, () =>
        problemResponse(409, "equipment_type_in_use"),
      ),
    );
    const { user, panel } = await openEdit(/^Mat ·/, "Editar tipo · Mat");
    await user.click(
      within(panel).getByRole("button", { name: "Quitar tipo" }),
    );
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "¿Quitar el tipo Mat?",
        }),
      ).getByRole("button", { name: "Quitar tipo" }),
    );
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Primero da de baja sus unidades en todas las sucursales.",
    );
  });
});
