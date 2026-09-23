import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { apiUrl, problemResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import {
  currentSessionPath,
  signedInHandlers,
  signedOutHandlers,
} from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const passwordPath = "/api/v1/accounts/current/password";

const openMenu = async (user: ReturnType<typeof renderAdmin>["user"]) => {
  await user.click(await screen.findByRole("button", { name: /Tu cuenta/ }));
  return screen.findByRole("dialog", { name: "Tu cuenta" });
};

describe("AW33 user menu on a desktop browser", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("replaces the placeholder with the signed-in Administrator", async () => {
    const { user } = renderAdmin("/");

    const trigger = await screen.findByRole("button", {
      name: "Tu cuenta: Paola Mendoza",
    });
    expect(within(trigger).getByText("PM")).toBeInTheDocument();
    expect(within(trigger).getByText("Paola Mendoza")).toBeInTheDocument();

    const menu = await openMenu(user);
    expect(menu).toHaveAttribute("data-presentation", "popover");
    expect(within(menu).getByText("Paola Mendoza")).toBeInTheDocument();
    expect(
      within(menu).getByText("paola.mendoza@example.com"),
    ).toBeInTheDocument();
    expect(within(menu).getByText("Administración")).toBeInTheDocument();
    expect(
      within(menu)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Cambiar contraseña", "Cerrar sesión"]);
  });

  it("changes the password in the side panel and keeps this browser signed in", async () => {
    let body: unknown;
    server.use(
      http.patch(apiUrl(passwordPath), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderAdmin("/");
    const menu = await openMenu(user);

    await user.click(
      within(menu).getByRole("button", { name: "Cambiar contraseña" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Cambiar contraseña",
    });
    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(panel).getByText("Tu sesión seguirá abierta en este navegador."),
    ).toBeInTheDocument();
    const save = within(panel).getByRole("button", {
      name: "Guardar contraseña",
    });
    expect(save).toBeDisabled();

    await user.type(
      within(panel).getByLabelText("Contraseña actual"),
      "emma-local-2026",
    );
    await user.type(
      within(panel).getByLabelText("Contraseña nueva"),
      "nueva-clave-2026",
    );
    await user.type(
      within(panel).getByLabelText("Confirmar contraseña"),
      "nueva-clave-2026",
    );
    await user.click(save);

    expect(await within(panel).findByRole("status")).toHaveTextContent(
      "Tu contraseña se actualizó. Cerramos tus otras sesiones abiertas.",
    );
    expect(body).toEqual({
      currentPassword: "emma-local-2026",
      newPassword: "nueva-clave-2026",
    });
  });

  it("marks a wrong current password on its field", async () => {
    server.use(
      http.patch(apiUrl(passwordPath), () =>
        problemResponse(400, "current_password_incorrect"),
      ),
    );
    const { user } = renderAdmin("/");
    await user.click(
      within(await openMenu(user)).getByRole("button", {
        name: "Cambiar contraseña",
      }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Cambiar contraseña",
    });

    await user.type(
      within(panel).getByLabelText("Contraseña actual"),
      "equivocada",
    );
    await user.type(
      within(panel).getByLabelText("Contraseña nueva"),
      "nueva-clave-2026",
    );
    await user.type(
      within(panel).getByLabelText("Confirmar contraseña"),
      "nueva-clave-2026",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Guardar contraseña" }),
    );

    expect(
      await within(panel).findByText("La contraseña actual no es correcta."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByLabelText("Contraseña actual"),
    ).toHaveAccessibleDescription("La contraseña actual no es correcta.");
  });

  it("asks before logging out, can be cancelled, and then returns to Login", async () => {
    let loggedOut = false;
    server.use(
      http.delete(apiUrl(currentSessionPath), () => {
        loggedOut = true;
        server.use(...signedOutHandlers());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router, user } = renderAdmin("/back-office/gastos");
    let menu = await openMenu(user);

    await user.click(
      within(menu).getByRole("button", { name: "Cerrar sesión" }),
    );
    expect(within(menu).getByText("¿Cerrar sesión?")).toBeInTheDocument();
    expect(
      within(menu).getByText("Se descartará cualquier panel sin guardar."),
    ).toBeInTheDocument();
    await user.click(within(menu).getByRole("button", { name: "Cancelar" }));
    expect(
      within(menu).getByRole("button", { name: "Cambiar contraseña" }),
    ).toBeInTheDocument();
    expect(loggedOut).toBe(false);

    await user.click(
      within(menu).getByRole("button", { name: "Cerrar sesión" }),
    );
    menu = screen.getByRole("dialog", { name: "Tu cuenta" });
    await user.click(
      within(menu).getByRole("button", { name: "Cerrar sesión" }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(loggedOut).toBe(true);
    expect(router.state.location.search).toEqual({});
  });
});

describe("AW33 user menu on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps only the avatar, opens the menu as a bottom sheet and the password panel full screen", async () => {
    const { user } = renderAdmin("/");

    const trigger = await screen.findByRole("button", {
      name: "Tu cuenta: Paola Mendoza",
    });
    expect(within(trigger).getByText("Paola Mendoza")).toHaveClass("sr-only");

    const menu = await openMenu(user);
    expect(menu).toHaveAttribute("data-presentation", "bottom-sheet");

    await user.click(
      within(menu).getByRole("button", { name: "Cambiar contraseña" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Cambiar contraseña" }),
    ).toHaveAttribute("data-presentation", "full-screen");
  });
});
