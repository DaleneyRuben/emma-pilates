import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  allBranchesHandler,
  camila,
  paolaMember,
  referralCodeHandler,
  staffMembersPath,
  staffPage,
} from "../../test/people-fixtures";
import {
  memberPath,
  openMember,
  record,
  sent,
} from "../../test/staff-panel-support";
import { signedInHandlers } from "../../test/session-handlers";

const newEmail = "camila.nueva@example.com";
// 15:40 UTC is 11:40 in La Paz, on Friday 6 November.
const pendingEmail = {
  email: newEmail,
  expiresAt: "2026-11-06T15:40:00.000Z",
};
const waiting = { ...camila, pendingEmail };

const listOf = (member: typeof camila) =>
  http.get(apiUrl(staffMembersPath), () =>
    jsonResponse(staffPage([member, paolaMember])),
  );
const changePath = `${memberPath(camila.id)}/email-change`;

// FIX-039 (DES-012, proposal A «Campo y confirmar al guardar», owner
// 2026-11-06): the Administrator changes an active member's login email;
// it changes only when the new address opens its link.
describe("AW24 Editar miembro email change", () => {
  useMockServer();
  beforeEach(() => {
    sent.length = 0;
    server.use(
      ...signedInHandlers(),
      allBranchesHandler(),
      referralCodeHandler(),
    );
  });

  it("asks before sending the link, then shows the change waiting", async () => {
    server.use(
      listOf(camila),
      http.post(
        apiUrl(changePath),
        record(() => jsonResponse(waiting)),
      ),
    );
    const { panel, user } = await openMember("Camila Rojas");

    const email = within(panel).getByRole("textbox", {
      name: "Correo electrónico",
    });
    expect(email).toHaveValue(camila.email);
    await user.clear(email);
    await user.type(email, newEmail);
    expect(
      within(panel).getByText(
        "Al guardar, le enviamos un enlace a este correo. Cambia cuando Camila lo abra.",
      ),
    ).toBeVisible();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Cambiar el correo de Camila?",
    });
    expect(
      within(dialog).getByText(
        `Le enviaremos un enlace a ${newEmail}. El correo cambia cuando Camila lo abra; hasta entonces sigue entrando con ${camila.email}.`,
      ),
    ).toBeVisible();
    expect(
      within(dialog).getByText(`También le avisamos a ${camila.email}.`),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Volver" }));
    expect(sent).toEqual([]);

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "¿Cambiar el correo de Camila?",
        }),
      ).getByRole("button", { name: "Enviar enlace" }),
    );

    await waitFor(() =>
      expect(sent).toEqual([
        { method: "POST", path: changePath, body: { email: newEmail } },
      ]),
    );
    const card = await within(panel).findByRole("status", {
      name: "Esperando que Camila confirme",
    });
    expect(
      within(card).getByText(
        `Enviamos un enlace a ${newEmail}. Hasta que lo abra, sigue entrando con ${camila.email}.`,
      ),
    ).toBeVisible();
    expect(
      within(card).getByText(
        "El enlace vence el vie 6 de noviembre a las 11:40.",
      ),
    ).toBeVisible();
    // The login email stays the current one in the field.
    expect(
      within(panel).getByRole("textbox", { name: "Correo electrónico" }),
    ).toHaveValue(camila.email);
  });

  it("resends the link and cancels the change from the card", async () => {
    server.use(
      listOf(waiting),
      http.post(
        apiUrl(`${changePath}/resends`),
        record(() => jsonResponse(waiting)),
      ),
      http.delete(
        apiUrl(changePath),
        record(() => jsonResponse({ ...camila, pendingEmail: null })),
      ),
    );
    const { panel, user } = await openMember("Camila Rojas");
    const card = within(panel).getByRole("status", {
      name: "Esperando que Camila confirme",
    });

    await user.click(
      within(card).getByRole("button", { name: "Reenviar enlace" }),
    );
    expect(
      await within(card).findByText(
        "Enviamos otro enlace. Solo sirve el más reciente.",
      ),
    ).toBeVisible();

    await user.click(
      within(card).getByRole("button", { name: "Cancelar cambio" }),
    );
    expect(
      await within(panel).findByText(
        `Cancelamos el cambio. Camila sigue entrando con ${camila.email}.`,
      ),
    ).toBeVisible();
    expect(
      within(panel).queryByRole("status", {
        name: "Esperando que Camila confirme",
      }),
    ).not.toBeInTheDocument();
    expect(sent.map(({ method, path }) => `${method} ${path}`)).toEqual([
      `POST ${changePath}/resends`,
      `DELETE ${changePath}`,
    ]);
  });

  it("refuses an address another account uses, in the field", async () => {
    server.use(
      listOf(camila),
      http.post(apiUrl(changePath), () => problemResponse(409, "email_in_use")),
    );
    const { panel, user } = await openMember("Camila Rojas");

    const email = within(panel).getByRole("textbox", {
      name: "Correo electrónico",
    });
    await user.clear(email);
    await user.type(email, "paola@example.com");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Enviar enlace",
      }),
    );

    expect(
      await within(panel).findByText("Este correo ya pertenece a otra cuenta."),
    ).toBeVisible();
  });

  it("shows the wait when the new address got an email recently", async () => {
    server.use(
      listOf(waiting),
      http.post(apiUrl(`${changePath}/resends`), () =>
        problemResponse(429, "email_throttled", {
          headers: { "Retry-After": "53" },
        }),
      ),
    );
    const { panel, user } = await openMember("Camila Rojas");

    await user.click(
      within(panel).getByRole("button", { name: "Reenviar enlace" }),
    );

    expect(
      await within(panel).findByText(
        "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
      ),
    ).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Reenviar enlace" }),
    ).toBeDisabled();
  });

  it("names the waiting address in Personal", async () => {
    server.use(listOf(waiting));
    const { user } = await openMember("Camila Rojas");
    await user.keyboard("{Escape}");

    expect(await screen.findByText(`Por confirmar: ${newEmail}`)).toBeVisible();
  });
});
