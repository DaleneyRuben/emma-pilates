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
import { signedInHandlers } from "../../test/session-handlers";

const invitationPath = `/api/v1/assistant/client-invitations/${lucia.id}`;

const handlers = (bounced: boolean) => [
  http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
  http.get(apiUrl(`${clientsPath}/:clientId`), () =>
    jsonResponse({ ...luciaDetail, accountStatus: "pending" }),
  ),
  http.get(apiUrl(`${invitationPath}/email-delivery`), () =>
    jsonResponse({ clientId: lucia.id, email: "lucia@ejemplo.con", bounced }),
  ),
  http.get(apiUrl(invitationPath), () =>
    jsonResponse({
      clientId: lucia.id,
      name: "Lucía Fernández",
      email: "lucia@ejemplo.con",
      phone: "+591 70011001",
      pendingExpiresAt: "2099-04-01T15:00:00.000Z",
      activationExpiresAt: "2099-03-05T15:00:00.000Z",
      cancellable: true,
    }),
  ),
];

const openLucia = async () => {
  const rendered = renderAdmin("/clientas");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  return screen.findByRole("dialog", { name: "Lucía Fernández" });
};

// Walkthrough n.º 2 (RW-clientas-ficha-correo-rebotado): Resend reported a
// hard bounce for her address, so the file says so instead of «Pendiente
// de activación», and a resend to the same address is not offered.
describe("a pending Client whose email bounced", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), acquisitionHandler());
  });

  it("says «El correo rebotó» with the address it could not reach", async () => {
    server.use(...handlers(true));
    const panel = await openLucia();

    const notice = (await within(panel).findByText("El correo rebotó")).closest(
      "section",
    ) as HTMLElement;
    expect(
      within(notice).getByText(
        "No pudimos entregar el correo de activación a lucia@ejemplo.con: esa dirección no existe. Confirma el correo con la clienta.",
      ),
    ).toBeVisible();
    expect(within(panel).queryByText("Pendiente de activación")).toBeNull();
    expect(
      within(notice).queryByRole("button", { name: "Reenviar enlace" }),
    ).toBeNull();
  });

  it("keeps «Pendiente de activación» while nothing bounced", async () => {
    server.use(...handlers(false));
    const panel = await openLucia();

    expect(
      await within(panel).findByText("Pendiente de activación"),
    ).toBeVisible();
    expect(within(panel).queryByText("El correo rebotó")).toBeNull();
  });

  it("keeps «Pendiente de activación» when the delivery cannot be read", async () => {
    server.use(
      ...handlers(false),
      http.get(apiUrl(`${invitationPath}/email-delivery`), () =>
        problemResponse(500, "unexpected_error"),
      ),
    );
    const panel = await openLucia();

    expect(
      await within(panel).findByText("Pendiente de activación"),
    ).toBeVisible();
  });
});
