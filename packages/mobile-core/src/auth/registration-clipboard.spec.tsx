import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
    completeEmailChange: jest.fn(),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    lookUpReferralCode: jest.fn().mockResolvedValue({
      code: "LUCIA",
      holderFirstName: "Lucía",
      holderKind: "client",
      status: "valid",
    }),
    readRegistrationStatus: jest.fn().mockResolvedValue("pending"),
    register: jest.fn(),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn(),
  } as AuthenticationApi;
}

async function openRegistration(readClipboardCode: () => Promise<string | null>) {
  const screen = await render(
    <AuthenticationFlow api={createApiMock()} readClipboardCode={readClipboardCode} />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
  return screen;
}

// Walkthrough n.º 13 (C01b8): on an iPhone the invite page copied the code;
// «Crea tu cuenta» offers it instead of filling it unasked.
describe("«Crea tu cuenta» and a code on the clipboard", () => {
  it("offers a friend's code it finds, and fills it on «Usar código»", async () => {
    const screen = await openRegistration(jest.fn().mockResolvedValue("lucia"));

    expect(await screen.findByText("¿Te invitó Lucía?")).toBeOnTheScreen();
    expect(screen.getByText("Usa su código y tu primera clase es gratis.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Usar código LUCIA" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Código de referido")).toHaveProp("value", "LUCIA"),
    );
    expect(screen.queryByText("¿Te invitó Lucía?")).toBeNull();
  });

  it("leaves the form as it was on «No, gracias»", async () => {
    const screen = await openRegistration(jest.fn().mockResolvedValue("LUCIA"));

    await fireEvent.press(await screen.findByRole("button", { name: "No, gracias" }));

    expect(screen.queryByLabelText("Código de referido")).toBeNull();
  });

  it("offers nothing for text that is not a code", async () => {
    const read = jest.fn().mockResolvedValue("hola, ¿vamos al pilates mañana?");
    const screen = await openRegistration(read);

    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(screen.queryByText(/¿Te invitó/)).toBeNull();
  });
});
