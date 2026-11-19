import { within } from "@testing-library/react";
import { useMockServer, server } from "../../test/msw";
import {
  allBranchesHandler,
  referralCodeHandler,
} from "../../test/people-fixtures";
import { signedInHandlers } from "../../test/session-handlers";
import { list, openMember } from "../../test/staff-panel-support";

// FIX-091 (W14 A): «Editar miembro» is one page by sections, Datos, Rol y
// sucursales and, for a Trainer, Código de invitación, under one «Guardar
// cambios» beside the account's own action.
describe("AW24 Editar miembro by sections", () => {
  useMockServer();
  beforeEach(() => {
    server.use(
      ...signedInHandlers(),
      allBranchesHandler(),
      referralCodeHandler(),
      list(),
    );
  });

  it("groups a Trainer's fields in three sections under one save", async () => {
    const { panel } = await openMember("Emma Vargas");
    const region = (name: string) =>
      within(panel).getByRole("region", { name });

    expect(await within(panel).findByLabelText("Código personal")).toBe(
      within(region("Código de invitación")).getByLabelText("Código personal"),
    );
    const datos = region("Datos");
    expect(within(datos).getByLabelText("Nombre")).toHaveValue("Emma Vargas");
    expect(
      within(datos).getByRole("textbox", { name: "Correo electrónico" }),
    ).toBeVisible();
    expect(within(datos).getByLabelText("Celular")).toBeVisible();
    expect(
      within(datos).getByRole("button", { name: "Cambiar foto" }),
    ).toBeVisible();

    const roles = region("Rol y sucursales");
    expect(
      within(roles).getByRole("radio", { name: "Femenino" }),
    ).toBeChecked();
    expect(
      within(within(roles).getByRole("group", { name: "Rol" })).getAllByRole(
        "radio",
      ),
    ).toHaveLength(5);
    expect(
      within(roles).getByRole("checkbox", { name: "Centro" }),
    ).toBeChecked();

    expect(
      within(panel).getAllByRole("button", { name: /^Guardar/ }),
    ).toHaveLength(1);
    expect(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    ).toHaveAttribute("type", "submit");
    expect(
      within(panel).getByRole("button", { name: "Desactivar cuenta" }),
    ).toBeVisible();
  });

  it("keeps a pending invitation in Datos and leaves out the code for other Roles", async () => {
    const { panel } = await openMember("Valentina Soria");
    const datos = within(panel).getByRole("region", { name: "Datos" });
    expect(within(datos).getByText("Pendiente de activación")).toBeVisible();
    expect(
      within(panel).getByRole("region", { name: "Rol y sucursales" }),
    ).toBeVisible();
    expect(
      within(panel).queryByRole("region", { name: "Código de invitación" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Cancelar invitación" }),
    ).toBeVisible();
  });
});
