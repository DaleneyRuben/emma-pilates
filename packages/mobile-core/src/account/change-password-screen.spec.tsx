import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ChangePasswordScreen } from "./change-password-screen";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

async function fillForm(
  screen: Awaited<ReturnType<typeof render>>,
  values: { current: string; next: string; confirm: string },
) {
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña actual"),
    values.current,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña nueva"),
    values.next,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Confirmar contraseña"),
    values.confirm,
  );
}

describe("ChangePasswordScreen", () => {
  it("keeps the save button disabled until the three fields are valid", async () => {
    const screen = await render(
      <ChangePasswordScreen
        fetcher={jest.fn()}
        onBack={jest.fn()}
        onSaved={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    ).toHaveProp("accessibilityState", { disabled: true });

    await fillForm(screen, {
      current: "Emma2026lucia",
      next: "Reformer2026lm",
      confirm: "Reformer2026",
    });

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    ).toHaveProp("accessibilityState", { disabled: true });
  });

  it("changes the password through the API and reports success", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const onSaved = jest.fn();
    const screen = await render(
      <ChangePasswordScreen fetcher={fetcher} onBack={jest.fn()} onSaved={onSaved} />,
    );

    await fillForm(screen, {
      current: "Emma2026lucia",
      next: "Reformer2026lm",
      confirm: "Reformer2026lm",
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/accounts/current/password",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "Emma2026lucia",
          newPassword: "Reformer2026lm",
        }),
      }),
    );
  });

  it("shows the server rejection under the current password field", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ code: "current_password_incorrect", status: 400 }, 400),
      );
    const onSaved = jest.fn();
    const screen = await render(
      <ChangePasswordScreen fetcher={fetcher} onBack={jest.fn()} onSaved={onSaved} />,
    );

    await fillForm(screen, {
      current: "Emma2025lucia",
      next: "Reformer2026lm",
      confirm: "Reformer2026lm",
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("La contraseña actual no es correcta."),
      ).toBeOnTheScreen();
    });
    expect(onSaved).not.toHaveBeenCalled();
  });
});
