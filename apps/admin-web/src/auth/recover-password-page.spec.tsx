import { screen } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";

const recoveryPath = "/api/v1/password-recovery-requests";

const request = async (user: ReturnType<typeof renderAdmin>["user"]) => {
  await user.type(
    await screen.findByRole("textbox", { name: "Correo electrónico" }),
    "paola.mendoza@example.com",
  );
  await user.click(screen.getByRole("button", { name: "Enviar enlace" }));
};

describe("AW30 Recuperar contraseña", () => {
  useMockServer();

  it("explains the email link and leads back to Login", async () => {
    renderAdmin("/recuperar-contrasena");

    expect(
      await screen.findByText(
        "Te enviaremos un enlace para restablecer tu contraseña.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a iniciar sesión" }),
    ).toHaveAttribute("href", "/iniciar-sesion");
  });

  it("shows the same neutral sent state whatever the backend knows about the email", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(recoveryPath), async ({ request: sent }) => {
        body = await sent.json();
        return jsonResponse({ status: "accepted" }, 202);
      }),
    );
    const { user } = renderAdmin("/recuperar-contrasena");

    await request(user);

    expect(
      await screen.findByRole("heading", { name: "Revisa tu correo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El enlace vence en 30 minutos."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar enlace" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a iniciar sesión" }),
    ).toHaveAttribute("href", "/iniciar-sesion");
    expect(body).toEqual({ email: "paola.mendoza@example.com" });
  });

  it("asks for a valid email before sending", async () => {
    const { user } = renderAdmin("/recuperar-contrasena");

    await user.click(
      await screen.findByRole("button", { name: "Enviar enlace" }),
    );

    expect(
      screen.getByRole("textbox", { name: "Correo electrónico" }),
    ).toHaveAccessibleDescription("Escribe un correo electrónico válido.");
  });

  it("waits out a broader throttling limit with the server's Retry-After", async () => {
    server.use(
      http.post(apiUrl(recoveryPath), () =>
        problemResponse(429, "rate_limit_exceeded", {
          headers: { "Retry-After": "90" },
        }),
      ),
    );
    const { user } = renderAdmin("/recuperar-contrasena");

    await request(user);

    // AW30: a neutral notice above the field, never an error.
    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(
      "Demasiadas solicitudes. Intenta de nuevo en un momento; si ya recibiste un enlace, sigue sirviendo.",
    );
    expect(notice).toHaveTextContent("Podrás pedirlo en 1:30.");
    expect(
      notice.compareDocumentPosition(
        screen.getByRole("textbox", { name: "Correo electrónico" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar enlace" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("heading", { name: "Revisa tu correo" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the form when the request could not be sent", async () => {
    server.use(
      http.post(apiUrl(recoveryPath), () =>
        problemResponse(500, "unexpected_error"),
      ),
    );
    const { user } = renderAdmin("/recuperar-contrasena");

    await request(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos enviar el enlace. Inténtalo de nuevo en unos minutos.",
    );
    expect(
      screen.getByRole("textbox", { name: "Correo electrónico" }),
    ).toHaveValue("paola.mendoza@example.com");
  });
});
