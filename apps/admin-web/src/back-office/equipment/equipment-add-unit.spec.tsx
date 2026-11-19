import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { centro } from "../../test/booking-handlers";
import {
  branchEquipment,
  equipmentHandlers,
  equipmentPath,
  piece,
  reformerType,
} from "../../test/equipment-fixtures";
import { typeDetail } from "../../test/equipment-table";
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
const recordPost = (path: string, respond: () => Response) =>
  http.post(apiUrl(path), async ({ request }) => {
    const text = await request.text();
    bodies.push(text === "" ? null : JSON.parse(text));
    return respond();
  });

const openAddReformer = async () => {
  const { user } = renderAdmin("/estudio/equipos");
  const reformers = await typeDetail(user, "Reformer");
  await user.click(within(reformers).getByRole("button", { name: "Agregar" }));
  const panel = await screen.findByRole("dialog", { name: "Agregar Reformer" });
  return { user, panel, field: within(panel).getByLabelText("Número") };
};

// AW37: «Agregar» on a type's row adds a numbered unit (finding 103).
describe("AW37 Equipos: adding a unit", () => {
  useMockServer();
  beforeEach(() => {
    bodies.length = 0;
    server.use(...signedInHandlers());
  });

  it("opens Agregar with the type's first free number and adds the unit", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(equipmentPath, () => jsonResponse(piece("reformer", 4), 201)),
    );
    const { user, panel, field } = await openAddReformer();
    expect(field).toHaveValue("4");
    expect(
      within(panel).getByText("Se mostrará como Reformer 4."),
    ).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Agregar" }));
    expect(await screen.findByText("Agregamos Reformer 4.")).toBeVisible();
    expect(bodies).toEqual([
      { branchId: centro.id, typeId: reformerType.id, number: 4 },
    ]);
  });

  it("warns about a taken number while typing and blocks Agregar (finding 103)", async () => {
    server.use(...equipmentHandlers());
    const { user, panel, field } = await openAddReformer();
    await user.clear(field);
    await user.type(field, "1");
    expect(within(panel).getByRole("alert")).toHaveTextContent(
      "Ya hay un Reformer 1 en esta sucursal. El primer número libre es el 4.",
    );
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(
      within(panel).queryByText(/Se mostrará como/),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeDisabled();

    await user.clear(field);
    expect(
      within(panel).getByText("Del 1 al 99, único por tipo en esta sucursal."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeDisabled();

    await user.type(field, "7");
    expect(
      within(panel).getByText("Se mostrará como Reformer 7."),
    ).toBeInTheDocument();
    expect(within(panel).queryByRole("alert")).not.toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "false");
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeEnabled();
  });

  it("keeps the server's refusal for a number taken meanwhile", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(equipmentPath, () =>
        problemResponse(409, "equipment_number_taken"),
      ),
    );
    const { user, panel, field } = await openAddReformer();
    await user.click(within(panel).getByRole("button", { name: "Agregar" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Ya hay un Reformer 4 en esta sucursal.",
    );
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeDisabled();
    await user.clear(field);
    await user.type(field, "6");
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeEnabled();
  });

  it("refreshes the units after a number taken meanwhile", async () => {
    let items = branchEquipment;
    server.use(
      http.get(apiUrl(equipmentPath), () => jsonResponse({ items })),
      ...equipmentHandlers(),
      recordPost(equipmentPath, () => {
        items = [...branchEquipment, piece("reformer", 4)];
        return problemResponse(409, "equipment_number_taken");
      }),
    );
    const { user, panel } = await openAddReformer();
    await user.click(within(panel).getByRole("button", { name: "Agregar" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Ya hay un Reformer 4 en esta sucursal. El primer número libre es el 6.",
    );
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeDisabled();
  });
});
