import { screen } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { signedOutHandlers } from "../test/session-handlers";

const completionPath = "/api/v1/email-changes";

const completed = (status: string, seen: unknown[] = []) =>
  http.post(apiUrl(completionPath), async ({ request }) => {
    seen.push(await request.json());
    return jsonResponse({ status });
  });

// FIX-039 (DES-012): on a computer, the link the studio's email change sends
// to the new address is confirmed here, as AW32 completes the other links.
describe("Confirmar correo", () => {
  useMockServer();
  beforeEach(() => server.use(...signedOutHandlers()));

  it("confirms the new email from the link's token", async () => {
    const seen: unknown[] = [];
    server.use(completed("changed", seen));
    renderAdmin("/confirmar-correo?token=change-secret");

    expect(
      await screen.findByRole("heading", { name: "Correo confirmado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Desde ahora entras con tu correo nuevo. Tu contraseña no cambió.",
      ),
    ).toBeInTheDocument();
    expect(seen).toEqual([{ token: "change-secret" }]);
    expect(
      screen.getByRole("link", { name: "Ir a iniciar sesión" }),
    ).toHaveAttribute("href", "/iniciar-sesion");
  });

  it.each([
    [
      "expired",
      "El enlace ya no sirve",
      "Este enlace venció o ya no sirve. Pide en el estudio que te envíen otro; mientras tanto sigues entrando con tu correo anterior.",
    ],
    [
      "email_unavailable",
      "No pudimos cambiar el correo",
      "Ese correo ya lo usa otra cuenta, así que no lo cambiamos. Habla con el estudio.",
    ],
    ["invalid", "Enlace no válido", "Este enlace no es válido."],
  ])(
    "says when the change cannot complete (%s)",
    async (status, title, line) => {
      server.use(completed(status));
      renderAdmin("/confirmar-correo?token=change-secret");

      expect(
        await screen.findByRole("heading", { name: title }),
      ).toBeInTheDocument();
      expect(screen.getByText(line)).toBeInTheDocument();
    },
  );

  it("treats a link without a token as not valid, without asking", async () => {
    const seen: unknown[] = [];
    server.use(completed("changed", seen));
    renderAdmin("/confirmar-correo");

    expect(
      await screen.findByRole("heading", { name: "Enlace no válido" }),
    ).toBeInTheDocument();
    expect(seen).toEqual([]);
  });
});
