import { fireEvent, render } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

const api = {
  requestPasswordRecovery: jest.fn().mockResolvedValue({ status: "accepted" }),
} as unknown as AuthenticationApi;

const emailField = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getByLabelText("Correo electrónico");

// MOB-036: S01 and S18 suggest the studio's own domain to the team. FIX-089
// (FormB): the example sits under the field as «Ej.: …», never inside it.
describe("The email example on Login and recovery (01, 20, S01, S18)", () => {
  it.each([
    ["the Staff app", false, "tu@emmapilates.bo"],
    ["the Client app", true, "tu@correo.com"],
  ])("shows %s its example on Login and recovery", async (_app, client, example) => {
    const screen = await render(<AuthenticationFlow allowClientRegistration={client} api={api} />);

    expect(emailField(screen)).not.toHaveProp("placeholder", example);
    expect(screen.getByText(`Ej.: ${example}`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    expect(emailField(screen)).not.toHaveProp("placeholder", example);
    expect(screen.getByText(`Ej.: ${example}`)).toBeOnTheScreen();
  });
});
