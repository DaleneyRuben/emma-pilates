import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { VerifyEmailScreen } from "./verify-email-screen";

function renderScreen(verifyClientEmail: jest.Mock, overrides: { onBack?: jest.Mock } = {}) {
  const onBack = overrides.onBack ?? jest.fn();
  const onSettled = jest.fn();
  const onVerified = jest.fn();
  const screen = render(
    <VerifyEmailScreen
      api={{ verifyClientEmail } as never}
      onBack={onBack}
      onSettled={onSettled}
      onVerified={onVerified}
      token="verification-token"
    />,
  );

  return { onBack, onSettled, onVerified, screen };
}

// Walkthrough n.º 3: a failed verification left «Verificando correo» up with no way out.
describe("VerifyEmailScreen", () => {
  it("offers a retry and Login when the verification fails", async () => {
    const verifyClientEmail = jest.fn().mockRejectedValue(new Error("Network request failed"));
    const { onBack, screen } = renderScreen(verifyClientEmail);
    const rendered = await screen;

    await waitFor(() => {
      expect(rendered.getByText("No pudimos verificar tu enlace")).toBeOnTheScreen();
    });
    expect(rendered.getByText("Revisa tu conexión e inténtalo de nuevo.")).toBeOnTheScreen();
    expect(rendered.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();

    await fireEvent.press(rendered.getByRole("button", { name: "Ir a iniciar sesión" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("verifies on retry and then reports the link as used", async () => {
    const verifyClientEmail = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce({ status: "verified" });
    const { onSettled, onVerified, screen } = renderScreen(verifyClientEmail);
    const rendered = await screen;

    await waitFor(() => {
      expect(rendered.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
    });
    expect(onSettled).not.toHaveBeenCalled();

    await fireEvent.press(rendered.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(rendered.getByText("Correo verificado")).toBeOnTheScreen();
    });
    expect(verifyClientEmail).toHaveBeenCalledTimes(2);
    expect(onVerified).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("reports a used link as settled", async () => {
    const verifyClientEmail = jest.fn().mockResolvedValue({ status: "invalid" });
    const { onSettled, onVerified, screen } = renderScreen(verifyClientEmail);
    const rendered = await screen;

    await waitFor(() => {
      expect(rendered.getByText("Enlace no válido")).toBeOnTheScreen();
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onVerified).not.toHaveBeenCalled();
  });

  // Review: the first answer may have been lost after the server verified,
  // so a used link after a retry does not claim the link was bad.
  it("words a used link after a retry as possibly already verified", async () => {
    const verifyClientEmail = jest
      .fn()
      .mockRejectedValueOnce(new Error("aborted"))
      .mockResolvedValueOnce({ status: "invalid" });
    const { screen } = renderScreen(verifyClientEmail);
    const rendered = await screen;

    await waitFor(() => {
      expect(rendered.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
    });
    await fireEvent.press(rendered.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(rendered.getByText("Enlace ya utilizado")).toBeOnTheScreen();
    });
    expect(
      rendered.getByText("Si ya verificaste tu correo, puedes iniciar sesión."),
    ).toBeOnTheScreen();
  });
});
