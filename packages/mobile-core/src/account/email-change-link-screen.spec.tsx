import { render, waitFor, fireEvent } from "@testing-library/react-native";

import { EmailChangeLinkScreen } from "./email-change-link-screen";

describe("EmailChangeLinkScreen", () => {
  it.each([
    ["changed", "Tu correo cambió", "Desde ahora inicia sesión con tu correo nuevo."],
    ["expired", "Enlace vencido", "Este enlace venció o ya fue utilizado. Pide el cambio de nuevo desde Editar perfil."],
    ["invalid", "Enlace no válido", "Este enlace no es válido."],
    ["email_unavailable", "Correo no disponible", "Ese correo ya está en uso. Pide el cambio con otro correo desde Editar perfil."],
  ] as const)("completes the link and shows the %s outcome", async (status, title, body) => {
    let finish: (result: { status: typeof status }) => void = () => undefined;
    const completeEmailChange = jest.fn(
      () =>
        new Promise<{ status: typeof status }>((resolve) => {
          finish = resolve;
        }),
    );
    const onDone = jest.fn();
    const screen = await render(
      <EmailChangeLinkScreen
        api={{ completeEmailChange }}
        onDone={onDone}
        token="change-secret"
      />,
    );

    expect(screen.getByText("Confirmando tu correo")).toBeOnTheScreen();
    finish({ status });
    await waitFor(() => {
      expect(screen.getByText(title)).toBeOnTheScreen();
    });
    expect(screen.getByText(body)).toBeOnTheScreen();
    expect(completeEmailChange).toHaveBeenCalledWith("change-secret");
    expect(onDone).not.toHaveBeenCalledWith(expect.anything());

    await fireEvent.press(screen.getByRole("button", { name: "Continuar" }));

    expect(onDone).toHaveBeenCalledWith(status === "changed");
  });
});
