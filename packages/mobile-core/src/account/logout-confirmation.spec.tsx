import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";

import { LogoutConfirmationSheet } from "./logout-confirmation";

// UX-002: «¿Cerrar sesión?» is the design's confirmation sheet, not a native alert.
describe("LogoutConfirmationSheet", () => {
  it("asks before logging out and only logs out on confirmation", async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    const onDismiss = jest.fn();
    const screen = await render(
      <LogoutConfirmationSheet logout={logout} onDismiss={onDismiss} visible />,
    );

    const sheet = within(screen.getByTestId("logout-sheet"));
    expect(sheet.getByText("¿Cerrar sesión?")).toBeOnTheScreen();
    expect(
      sheet.getByText(
        "Vuelves al inicio de sesión y tendrás que entrar de nuevo con tu correo y contraseña.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Cancelar" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();

    await fireEvent.press(sheet.getByTestId("logout-confirm"));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  // Follow-up 292 (C18l, E-F04, E-F28): the confirm button is filled with
  // Destructivo and labelled in white; «Cancelar» stays a quiet link.
  it("fills «Cerrar sesión» with Destructivo", async () => {
    const screen = await render(
      <LogoutConfirmationSheet logout={jest.fn()} onDismiss={jest.fn()} visible />,
    );

    expect(screen.getByTestId("logout-confirm")).toHaveStyle({
      backgroundColor: "#A04640",
      borderColor: "#A04640",
    });
    const sheet = within(screen.getByTestId("logout-sheet"));
    expect(sheet.getByText("Cerrar sesión")).toHaveStyle({ color: "#FFFBFB" });
  });

  it("keeps «Cerrar sesión» busy while the logout runs", async () => {
    let finish: () => void = () => undefined;
    const logout = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const screen = await render(
      <LogoutConfirmationSheet logout={logout} onDismiss={jest.fn()} visible />,
    );

    await fireEvent.press(screen.getByTestId("logout-confirm"));
    expect(screen.getByTestId("logout-confirm")).toBeBusy();

    await act(async () => finish());
    await waitFor(() => expect(screen.getByTestId("logout-confirm")).not.toBeBusy());
  });

  it("renders nothing while hidden", async () => {
    const screen = await render(
      <LogoutConfirmationSheet logout={jest.fn()} onDismiss={jest.fn()} visible={false} />,
    );

    expect(screen.queryByText("¿Cerrar sesión?")).toBeNull();
  });
});
