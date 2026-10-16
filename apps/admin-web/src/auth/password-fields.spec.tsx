import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers, signedOutHandlers } from "../test/session-handlers";

const eyes = (scope: HTMLElement) =>
  within(scope).getAllByRole("button", { name: "Mostrar contraseña" });

describe("every admin password field shows and hides (WEB-022)", () => {
  useMockServer();

  it("on AW01 Login", async () => {
    server.use(...signedOutHandlers());
    const { user } = renderAdmin("/");
    const password = await screen.findByLabelText("Contraseña");
    await user.type(password, "emma-local-2026");

    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("emma-local-2026");
  });

  it("on AW32 Crear contraseña, each field on its own", async () => {
    server.use(...signedOutHandlers());
    server.use(
      http.post(apiUrl("/api/v1/authentication-links/inspection"), () =>
        jsonResponse({ status: "current", purpose: "password_recovery" }),
      ),
    );
    const { user } = renderAdmin("/crear-contrasena?token=recovery-secret");
    const fresh = await screen.findByLabelText("Contraseña nueva");
    const form = fresh.closest("form") as HTMLElement;
    expect(eyes(form)).toHaveLength(2);

    await user.click(eyes(form)[0] as HTMLElement);
    expect(fresh).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirmar contraseña")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("on AW33 Cambiar contraseña", async () => {
    server.use(...signedInHandlers(), ...emptyPageHandlers());
    const { user } = renderAdmin("/");
    await user.click(await screen.findByRole("button", { name: /Tu cuenta/ }));
    const menu = await screen.findByRole("dialog", { name: "Tu cuenta" });
    await user.click(
      within(menu).getByRole("button", { name: "Cambiar contraseña" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Cambiar contraseña",
    });

    expect(eyes(panel)).toHaveLength(3);
  });
});
