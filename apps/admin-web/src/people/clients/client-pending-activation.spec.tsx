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
  acquisitionHandler,
  clientPage,
  clientsPath,
  lucia,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const invitationPath = `/api/v1/assistant/client-invitations/${lucia.id}`;
const invitation = (activationExpiresAt: string | null) => ({
  clientId: lucia.id,
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: "+591 70011001",
  pendingExpiresAt: "2099-04-01T15:00:00.000Z",
  activationExpiresAt,
  cancellable: true,
});

let resends = 0;
let reads = 0;
const pendingHandlers = (
  resend: () => Response,
  read: () => Response = () =>
    jsonResponse(invitation("2099-03-05T15:00:00.000Z")),
) => [
  http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
  http.get(apiUrl(`${clientsPath}/:clientId`), () =>
    jsonResponse({ ...luciaDetail, accountStatus: "pending" }),
  ),
  http.get(apiUrl(invitationPath), () => {
    reads += 1;
    return read();
  }),
  http.post(apiUrl(`${invitationPath}/resends`), () => {
    resends += 1;
    return resend();
  }),
];

const openLucia = async () => {
  const rendered = renderAdmin("/clientas");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Lucía Fernández" });
  const notice = (
    await within(panel).findByText("Pendiente de activación")
  ).closest("section") as HTMLElement;
  return { ...rendered, panel, notice };
};

const resendButton = async (notice: HTMLElement) =>
  within(notice).findByRole("button", { name: "Reenviar enlace" });

describe("AW22 Pendiente de activación with «Reenviar enlace»", () => {
  useMockServer();
  beforeEach(() => {
    resends = 0;
    reads = 0;
    server.use(...signedInHandlers(), acquisitionHandler());
  });

  it("explains the pending Account and when her link expires", async () => {
    server.use(...pendingHandlers(() => jsonResponse(invitation(null))));
    const { notice } = await openLucia();

    expect(
      within(notice).getByText(
        "Todavía no abrió el enlace del correo para crear su contraseña.",
      ),
    ).toBeVisible();
    expect(
      await within(notice).findByText("El enlace vence el jue 5 mar."),
    ).toBeVisible();
    expect(await resendButton(notice)).toBeEnabled();
  });

  it("says a lapsed link «venció» and still offers a new one", async () => {
    server.use(
      ...pendingHandlers(
        () => jsonResponse(invitation(null)),
        () => jsonResponse(invitation("2026-01-10T15:00:00.000Z")),
      ),
    );
    const { notice } = await openLucia();

    expect(
      await within(notice).findByText("El enlace venció el sáb 10 ene."),
    ).toBeVisible();
    expect(await resendButton(notice)).toBeEnabled();
  });

  it("re-sends the link and shows the new expiry", async () => {
    server.use(
      ...pendingHandlers(() =>
        jsonResponse(invitation("2099-03-12T15:00:00.000Z")),
      ),
    );
    const { notice, user } = await openLucia();

    await user.click(await resendButton(notice));

    expect(
      await within(notice).findByText(
        "Enviamos un nuevo enlace de activación.",
      ),
    ).toHaveAttribute("role", "status");
    expect(resends).toBe(1);
    expect(
      await within(notice).findByText("El enlace vence el jue 12 mar."),
    ).toBeVisible();
  });

  it("shows the server's wait when her address got an email recently", async () => {
    server.use(
      ...pendingHandlers(() =>
        problemResponse(429, "email_throttled", {
          headers: { "Retry-After": "53" },
        }),
      ),
    );
    const { panel, notice, user } = await openLucia();

    await user.click(await resendButton(notice));

    expect(
      await within(panel).findByText(
        "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
      ),
    ).toBeVisible();
    expect(within(panel).getByText("Podrás reenviarlo en 0:53.")).toBeVisible();
    expect(
      within(notice).getByRole("button", { name: "Reenviar enlace" }),
    ).toBeDisabled();
  });

  it("shows the Account's wait when the Administrator sent too many emails", async () => {
    server.use(
      ...pendingHandlers(() =>
        problemResponse(429, "staff_email_throttled", {
          headers: { "Retry-After": "120" },
        }),
      ),
    );
    const { panel, notice, user } = await openLucia();

    await user.click(await resendButton(notice));

    expect(
      await within(panel).findByText(/Enviaste muchos correos en poco tiempo/),
    ).toBeVisible();
    expect(within(panel).getByText("Podrás enviarlo en 2:00.")).toBeVisible();
  });

  it("says so when the invitation closed meanwhile", async () => {
    server.use(
      ...pendingHandlers(() =>
        problemResponse(404, "client_invitation_not_found"),
      ),
    );
    const { notice, user } = await openLucia();

    await user.click(await resendButton(notice));

    expect(
      await within(notice).findByText(
        "Ya activó su cuenta o la invitación ya no existe; vuelve a abrir la ficha.",
      ),
    ).toHaveAttribute("role", "alert");
  });

  it("asks to try again after any other failure", async () => {
    server.use(...pendingHandlers(() => problemResponse(500, "internal")));
    const { notice, user } = await openLucia();

    await user.click(await resendButton(notice));

    expect(
      await within(notice).findByText(
        "No pudimos reenviar el enlace. Inténtalo de nuevo.",
      ),
    ).toHaveAttribute("role", "alert");
  });

  it("still offers the resend after a passing failure to read her invitation", async () => {
    let attempts = 0;
    server.use(
      ...pendingHandlers(
        () => jsonResponse(invitation(null)),
        () => {
          attempts += 1;
          return attempts === 1
            ? problemResponse(500, "internal")
            : jsonResponse(invitation("2099-03-05T15:00:00.000Z"));
        },
      ),
    );
    const { notice } = await openLucia();

    expect(await resendButton(notice)).toBeEnabled();
  });

  it("offers no resend when there is no invitation to follow up", async () => {
    server.use(
      ...pendingHandlers(
        () => jsonResponse(invitation(null)),
        () => problemResponse(404, "client_verification_pending"),
      ),
    );
    const { notice } = await openLucia();

    expect(
      within(notice).getByText(
        "Todavía no abrió el enlace del correo para crear su contraseña.",
      ),
    ).toBeVisible();
    await waitFor(() => expect(reads).toBe(1));
    expect(
      within(notice).queryByRole("button", { name: "Reenviar enlace" }),
    ).not.toBeInTheDocument();
  });
});
