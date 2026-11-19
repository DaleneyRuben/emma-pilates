import { screen } from "@testing-library/react";
import { renderAdmin } from "../test/render-admin";
import { server, useMockServer } from "../test/msw";
import { signedOutHandlers } from "../test/session-handlers";

// FIX-089 (FormB): the email example sits under the field, never inside it.
describe("the email example on the web sign-in pages", () => {
  useMockServer();
  beforeEach(() => server.use(...signedOutHandlers()));

  it.each(["/iniciar-sesion", "/recuperar-contrasena"])(
    "gives the example under the field on %s",
    async (path) => {
      renderAdmin(path);

      const email = await screen.findByLabelText("Correo electrónico");
      expect(email).not.toHaveAttribute("placeholder", "tu@correo.com");
      expect(screen.getByText("Ej.: tu@correo.com")).toBeVisible();
    },
  );
});
