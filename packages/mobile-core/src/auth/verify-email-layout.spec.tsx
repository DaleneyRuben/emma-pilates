import { render, waitFor, within } from "@testing-library/react-native";

import { VerifyEmailScreen } from "./verify-email-screen";

const open = (verifyClientEmail: jest.Mock) =>
  render(
    <VerifyEmailScreen
      api={{ verifyClientEmail } as never}
      onBack={jest.fn()}
      onSettled={jest.fn()}
      onVerified={jest.fn()}
      token="verification-token"
    />,
  );

// Walkthrough n.º 3 and 8 (C01k, C01k2, C01k3): the C11 layout. The disc and
// the title sit on the band, the line in a white card, and the buttons on the
// white footer panel at the bottom.
describe("VerifyEmailScreen layout", () => {
  it("puts the outcome on the band and the buttons on the footer when it fails", async () => {
    const screen = await open(jest.fn().mockRejectedValue(new Error("offline")));

    await waitFor(() =>
      expect(screen.getByText("No pudimos verificar tu enlace")).toBeOnTheScreen(),
    );
    const band = within(screen.getByTestId("screen-header"));
    expect(band.getByTestId("status-disc")).toBeOnTheScreen();
    expect(band.getByRole("header", { name: "No pudimos verificar tu enlace" })).toBeOnTheScreen();
    const footer = within(screen.getByTestId("status-actions"));
    expect(footer.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
    expect(footer.getByRole("button", { name: "Ir a iniciar sesión" })).toBeOnTheScreen();
  });

  it("keeps only «Ir a iniciar sesión» on the footer once verified", async () => {
    const screen = await open(jest.fn().mockResolvedValue({ status: "verified" }));

    await waitFor(() => expect(screen.getByText("Correo verificado")).toBeOnTheScreen());
    const footer = within(screen.getByTestId("status-actions"));
    expect(footer.getByRole("button", { name: "Ir a iniciar sesión" })).toBeOnTheScreen();
    expect(footer.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });
});
