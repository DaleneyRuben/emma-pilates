import type { AdminClientDetailDto } from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  acquisitionHandler,
  clientPage,
  clientsPath,
  lucia,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";

// IDN-009 (follow-up 156): AW22 «Editar perfil» corrects the name and phone
// for the Administrator and the Coordinator; the Coordinator's panel shows no
// amount and cannot close an Account (ADR-0102).
const saved: unknown[] = [];
const handlers = (detail: AdminClientDetailDto) => [
  http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
  http.get(apiUrl(`${clientsPath}/:clientId`), () => jsonResponse(detail)),
  acquisitionHandler(),
  http.patch(apiUrl(`${clientsPath}/:clientId`), async ({ request }) => {
    const body = (await request.json()) as { name: string; phone: string };
    saved.push(body);
    return jsonResponse({ ...detail, ...body });
  }),
];

const openLucia = async () => {
  const rendered = renderAdmin("/back-office/clientes");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Lucía Fernández" }),
  };
};

describe("AW22 Editar perfil", () => {
  useMockServer();
  beforeEach(() => {
    saved.length = 0;
  });

  it("lets the Administrator correct the name and phone", async () => {
    server.use(...signedInHandlers(), ...handlers(luciaDetail));
    const { panel, user } = await openLucia();

    await user.click(
      await within(panel).findByRole("button", { name: "Editar perfil" }),
    );
    const name = within(panel).getByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "Lucía Fernández Paz");
    const phone = within(panel).getByLabelText("Teléfono");
    await user.clear(phone);
    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await within(panel).findByText("Guardamos los cambios del perfil."),
    ).toBeInTheDocument();
    expect(saved).toEqual([{ name: "Lucía Fernández Paz", phone: null }]);
    expect(within(panel).getByText(luciaDetail.email)).toBeInTheDocument();
  });

  it("asks for a name and keeps the form on a failed save", async () => {
    server.use(...signedInHandlers(), ...handlers(luciaDetail));
    const { panel, user } = await openLucia();
    await user.click(
      await within(panel).findByRole("button", { name: "Editar perfil" }),
    );

    await user.clear(within(panel).getByLabelText("Nombre"));
    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );
    expect(
      await within(panel).findByText("Escribe el nombre de la clienta."),
    ).toBeInTheDocument();
    expect(saved).toEqual([]);

    server.use(
      http.patch(apiUrl(`${clientsPath}/:clientId`), () =>
        problemResponse(500, "unexpected_error"),
      ),
    );
    await user.type(within(panel).getByLabelText("Nombre"), "Lucía");
    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );
    expect(
      await within(panel).findByText(
        "No pudimos guardar los cambios. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the Coordinator no amount and no «Cerrar cuenta»", async () => {
    server.use(...coordinatorHandlers(), ...handlers(luciaDetail));
    const { panel } = await openLucia();

    expect(
      await within(panel).findByRole("button", { name: "Editar perfil" }),
    ).toBeInTheDocument();
    expect(within(panel).queryByText("Crédito")).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Cerrar cuenta" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Agregar clase de cortesía" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Devolver una clase" }),
    ).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Bs");
  });
});
