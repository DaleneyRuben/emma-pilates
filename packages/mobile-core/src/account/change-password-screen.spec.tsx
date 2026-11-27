import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import { MobileIdentityProvider } from "../auth/identity-provider";
import type { SessionManager } from "../auth/session-manager";
import { noBiometrics } from "../testing";
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
  await fireEvent.changeText(screen.getByLabelText("Contraseña actual"), values.current);
  await fireEvent.changeText(screen.getByLabelText("Contraseña nueva"), values.next);
  await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), values.confirm);
}

describe("ChangePasswordScreen", () => {
  // Walkthrough n.º 6 and 15: the button ends the form, always on; a tap
  // marks what is missing instead of a silent disabled button.
  it("marks the missing fields on tap and sends nothing", async () => {
    const fetcher = jest.fn();
    const screen = await render(
      <ChangePasswordScreen fetcher={fetcher} onBack={jest.fn()} onSaved={jest.fn()} />,
    );
    const save = within(screen.getByTestId("change-password-form")).getByRole("button", {
      name: "Guardar contraseña",
    });

    expect(save).toBeEnabled();
    await fireEvent.press(save);

    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(fetcher).not.toHaveBeenCalled();

    await fillForm(screen, {
      current: "Emma2026lucia",
      next: "Reformer2026lm",
      confirm: "Reformer2026",
    });

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeOnTheScreen();
    await fireEvent.press(save);
    expect(fetcher).not.toHaveBeenCalled();
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
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));

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
      .mockResolvedValue(jsonResponse({ code: "current_password_incorrect", status: 400 }, 400));
    const onSaved = jest.fn();
    const screen = await render(
      <ChangePasswordScreen fetcher={fetcher} onBack={jest.fn()} onSaved={onSaved} />,
    );

    await fillForm(screen, {
      current: "Emma2025lucia",
      next: "Reformer2026lm",
      confirm: "Reformer2026lm",
    });
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => {
      expect(screen.getByText("La contraseña actual no es correcta.")).toBeOnTheScreen();
    });
    expect(onSaved).not.toHaveBeenCalled();
  });

  // ADR-0112: the server revoked this phone's biometric key with the old password.
  it("forgets this phone's biometric key once the password changes", async () => {
    const forgetBiometricsLocally = jest.fn().mockResolvedValue(undefined);
    const manager: SessionManager = {
      ...noBiometrics,
      endLocally: jest.fn(),
      forgetBiometricsLocally,
      hasBiometricSession: jest.fn().mockResolvedValue(true),
      logout: jest.fn(),
      refresh: jest.fn(),
      restore: jest.fn().mockResolvedValue({ accountId: "account-1", role: "client" }),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn(),
    };
    const screen = await render(
      <MobileIdentityProvider manager={manager}>
        <ChangePasswordScreen
          fetcher={jest.fn().mockResolvedValue(new Response(null, { status: 204 }))}
          onBack={jest.fn()}
          onSaved={jest.fn()}
        />
      </MobileIdentityProvider>,
    );
    await fillForm(screen, {
      current: "Emma2026lucia",
      next: "Reformer2026lm",
      confirm: "Reformer2026lm",
    });

    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(forgetBiometricsLocally).toHaveBeenCalledTimes(1));
  });
});
