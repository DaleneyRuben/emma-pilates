import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers, signedOutHandlers } from "../test/session-handlers";

const inspectionPath = "/api/v1/authentication-links/inspection";
const recoveryPath = "/api/v1/admin-web/password-recoveries";
const activationPath = "/api/v1/account-activations";

const inspected = (body: object) =>
  http.post(apiUrl(inspectionPath), () => jsonResponse(body));

const choosePassword = async (
  user: ReturnType<typeof renderAdmin>["user"],
  password = "nueva-clave-2026",
  confirmation = password,
) => {
  await user.type(await screen.findByLabelText("Contraseña nueva"), password);
  await user.type(screen.getByLabelText("Confirmar contraseña"), confirmation);
};

describe("AW32 Crear contraseña", () => {
  useMockServer();
  beforeEach(() => server.use(...signedOutHandlers()));

  it("inspects the link first and resets the password into a new browser session", async () => {
    let inspectedToken: unknown;
    let completed: unknown;
    server.use(
      http.post(apiUrl(inspectionPath), async ({ request }) => {
        inspectedToken = await request.json();
        return jsonResponse({
          status: "current",
          purpose: "password_recovery",
        });
      }),
      http.post(apiUrl(recoveryPath), async ({ request }) => {
        completed = await request.json();
        server.use(...signedInHandlers());
        return jsonResponse({ status: "recovered", signedIn: true });
      }),
    );
    const { user } = renderAdmin("/crear-contrasena?token=recovery-secret");

    expect(
      await screen.findByRole("heading", { name: "Crea una contraseña nueva" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Elige una contraseña nueva para tu cuenta."),
    ).toBeInTheDocument();
    expect(inspectedToken).toEqual({ token: "recovery-secret" });
    const save = screen.getByRole("button", { name: "Guardar contraseña" });
    expect(save).toBeDisabled();

    await choosePassword(user);
    await user.click(save);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
    expect(completed).toEqual({
      token: "recovery-secret",
      password: "nueva-clave-2026",
    });
  });

  it("keeps saving disabled and says why while the two passwords differ or are short", async () => {
    server.use(inspected({ status: "current", purpose: "password_recovery" }));
    const { user } = renderAdmin("/crear-contrasena?token=recovery-secret");

    await choosePassword(user, "nueva-clave-2026", "nueva-clave-2025");

    expect(
      screen.getByLabelText("Confirmar contraseña"),
    ).toHaveAccessibleDescription("Las contraseñas no coinciden.");
    expect(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    ).toBeDisabled();

    await user.clear(screen.getByLabelText("Contraseña nueva"));
    await user.type(screen.getByLabelText("Contraseña nueva"), "corta");
    expect(
      screen.getByLabelText("Contraseña nueva"),
    ).toHaveAccessibleDescription("Mínimo 8 caracteres.");
  });

  it("returns to Login with a confirmation when the recovery opened no browser session", async () => {
    server.use(
      inspected({ status: "current", purpose: "password_recovery" }),
      http.post(apiUrl(recoveryPath), () =>
        jsonResponse({ status: "recovered", signedIn: false }),
      ),
    );
    const { user } = renderAdmin("/crear-contrasena?token=recovery-secret");

    await choosePassword(user);
    await user.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Tu contraseña se actualizó. Inicia sesión con la nueva contraseña.",
    );
  });

  it("activates an invited Account and returns to Login without signing in", async () => {
    let activated: unknown;
    server.use(
      inspected({ status: "current", purpose: "activation" }),
      http.post(apiUrl(activationPath), async ({ request }) => {
        activated = await request.json();
        return jsonResponse({ status: "activated" });
      }),
    );
    const { user } = renderAdmin("/crear-contrasena?token=activation-secret");

    expect(
      await screen.findByRole("heading", { name: "Crea tu contraseña" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Elegir tu contraseña activa tu cuenta y confirma tu correo.",
      ),
    ).toBeInTheDocument();

    await choosePassword(user);
    await user.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Tu cuenta está activa. Inicia sesión con tu nueva contraseña.",
    );
    expect(activated).toEqual({
      token: "activation-secret",
      password: "nueva-clave-2026",
    });
  });

  it("explains an expired or used recovery link and offers a new one", async () => {
    server.use(inspected({ status: "expired", purpose: "password_recovery" }));
    renderAdmin("/crear-contrasena?token=recovery-secret");

    expect(
      await screen.findByRole("heading", {
        name: "Este enlace ya no es válido",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Los enlaces para restablecer la contraseña vencen a los 30 minutos y sirven una sola vez.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pedir un enlace nuevo" }),
    ).toHaveAttribute("href", "/recuperar-contrasena");
    expect(
      screen.getByRole("link", { name: "Volver a iniciar sesión" }),
    ).toBeInTheDocument();
  });

  it("sends an expired invitation back to the Administrator instead of offering a request", async () => {
    server.use(inspected({ status: "expired", purpose: "activation" }));
    renderAdmin("/crear-contrasena?token=activation-secret");

    const card = await screen.findByRole("main");
    expect(
      await within(card).findByRole("heading", {
        name: "Este enlace ya no es válido",
      }),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(
        "Las invitaciones vencen a los 7 días y sirven una sola vez. Pide a la administración del estudio que te envíe una nueva.",
      ),
    ).toBeInTheDocument();
    expect(
      within(card).queryByRole("link", { name: "Pedir un enlace nuevo" }),
    ).not.toBeInTheDocument();
  });

  it("says a 30-day-old invitation was removed (WEB-012 W8)", async () => {
    server.use(inspected({ status: "removed", purpose: "activation" }));
    renderAdmin("/crear-contrasena?token=activation-secret");

    const card = await screen.findByRole("main");
    expect(
      await within(card).findByRole("heading", {
        name: "Esta invitación ya no está activa",
      }),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(
        "Pasaron 30 días sin activarla, así que se eliminó. Para tener una cuenta, una administradora tiene que crear una invitación nueva en Personal.",
      ),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "Volver a iniciar sesión" }),
    ).toBeInTheDocument();
  });

  it("shows only a generic invalid-link state for an unknown or missing token", async () => {
    server.use(inspected({ status: "invalid" }));
    renderAdmin("/crear-contrasena?token=not-a-real-secret");

    expect(
      await screen.findByRole("heading", { name: "Este enlace no es válido" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Abre el enlace completo del correo más reciente que recibiste.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a iniciar sesión" }),
    ).toBeInTheDocument();
  });

  it("switches to the expired state when the link was used while the form was open", async () => {
    server.use(
      inspected({ status: "current", purpose: "password_recovery" }),
      http.post(apiUrl(recoveryPath), () =>
        jsonResponse({ status: "expired", signedIn: false }),
      ),
    );
    const { user } = renderAdmin("/crear-contrasena?token=recovery-secret");

    await choosePassword(user);
    await user.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Este enlace ya no es válido",
      }),
    ).toBeInTheDocument();
  });
});
