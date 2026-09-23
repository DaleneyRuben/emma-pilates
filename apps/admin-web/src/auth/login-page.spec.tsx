import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  paolaPrincipal,
  signedInHandlers,
  signedOutHandlers,
} from "../test/session-handlers";

const loginPath = "/api/v1/admin-web/authentication-sessions";

const fillLogin = async (
  user: ReturnType<typeof renderAdmin>["user"],
  email = "paola.mendoza@example.com",
  password = "emma-local-2026",
) => {
  await user.type(
    await screen.findByRole("textbox", { name: "Correo electrónico" }),
    email,
  );
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
};

describe("AW01 Login", () => {
  useMockServer();
  beforeEach(() => server.use(...signedOutHandlers()));

  it("signs in and returns to the page the Administrator wanted", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(loginPath), async ({ request }) => {
        body = await request.json();
        server.use(...signedInHandlers());
        return jsonResponse(paolaPrincipal, 201);
      }),
    );
    const { router, user } = renderAdmin("/catalogo/planes?page=2");

    await fillLogin(user);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Planes" }),
    ).toBeInTheDocument();
    expect(router.state.location.href).toBe(
      "/catalogo/planes?page=2&pageSize=20",
    );
    expect(body).toEqual({
      email: "paola.mendoza@example.com",
      password: "emma-local-2026",
    });
  });

  it("opens the schedule after a direct sign-in", async () => {
    server.use(
      http.post(apiUrl(loginPath), () => {
        server.use(...signedInHandlers());
        return jsonResponse(paolaPrincipal, 201);
      }),
    );
    const { user } = renderAdmin("/iniciar-sesion");

    await fillLogin(user);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
  });

  it("shows one neutral message for every rejection and keeps what was typed", async () => {
    server.use(
      http.post(apiUrl(loginPath), () =>
        problemResponse(401, "authentication_failed"),
      ),
    );
    const { user } = renderAdmin("/iniciar-sesion");

    await fillLogin(user, "camila.rojas@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El correo o la contraseña no son correctos.",
    );
    expect(
      screen.getByRole("textbox", { name: "Correo electrónico" }),
    ).toHaveValue("camila.rojas@example.com");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Iniciar sesión",
    );
  });

  it("counts down the server's Retry-After before allowing another attempt", async () => {
    server.use(
      http.post(apiUrl(loginPath), () =>
        problemResponse(429, "login_throttled", {
          headers: { "Retry-After": "2" },
        }),
      ),
    );
    const { user } = renderAdmin("/iniciar-sesion");

    await fillLogin(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Demasiados intentos. Intenta de nuevo en un momento.",
    );
    expect(alert).toHaveTextContent("Podrás intentarlo en 0:02.");
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeDisabled();

    expect(
      await screen.findByText("Podrás intentarlo en 0:01.", undefined, {
        timeout: 2000,
      }),
    ).toBeInTheDocument();
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: "Iniciar sesión" }),
        ).toBeEnabled(),
      { timeout: 3000 },
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks for a valid email and a password before calling the backend", async () => {
    const { user } = renderAdmin("/iniciar-sesion");

    await user.click(
      await screen.findByRole("button", { name: "Iniciar sesión" }),
    );

    expect(
      screen.getByRole("textbox", { name: "Correo electrónico" }),
    ).toHaveAccessibleDescription("Escribe un correo electrónico válido.");
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription(
      "Escribe tu contraseña.",
    );
  });

  it("explains a failure that is not a rejection without blaming the credentials", async () => {
    server.use(
      http.post(apiUrl(loginPath), () =>
        problemResponse(403, "untrusted_origin"),
      ),
    );
    const { user } = renderAdmin("/iniciar-sesion");

    await fillLogin(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.",
    );
  });

  it("leads to password recovery and shows the notice it was sent back with", async () => {
    renderAdmin("/iniciar-sesion?notice=activated");

    expect(
      await screen.findByRole("link", { name: "¿Olvidaste tu contraseña?" }),
    ).toHaveAttribute("href", "/recuperar-contrasena");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tu cuenta está activa. Inicia sesión con tu nueva contraseña.",
    );
  });
});
