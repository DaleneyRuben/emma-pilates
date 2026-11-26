import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
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

// Walkthrough n.º 13 (CW01b, C01b5): a friend's code reaches «Crea tu
// cuenta» already written, from the invite link or the install referrer.
describe("«Crea tu cuenta» with a code it was given", () => {
  it("opens from an invite link with the code filled in", async () => {
    const api = createApiMock();
    const onIntentHandled = jest.fn();
    const intent = { token: "LUCIA", type: "referral-invite" } as const;
    const screen = await render(
      <AuthenticationFlow api={api} intent={intent} onIntentHandled={onIntentHandled} />,
    );

    expect(screen.getByText("Crea tu cuenta")).toBeOnTheScreen();
    expect(screen.getByLabelText("Código de referido")).toHaveProp("value", "LUCIA");
    expect(await screen.findByText("Código de Lucía")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Recomendación de una amiga" })).toBeChecked();

    await fireEvent.press(screen.getByRole("button", { name: "Inicia sesión" }));
    expect(onIntentHandled).toHaveBeenCalledWith(intent);
  });

  it("fills a suggested code once she opens «Crea tu cuenta»", async () => {
    const screen = await render(
      <AuthenticationFlow api={createApiMock()} suggestedReferralCode="LUCIA" />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Código de referido")).toHaveProp("value", "LUCIA"),
    );
    expect(await screen.findByText("Código de Lucía")).toBeOnTheScreen();
  });
});
