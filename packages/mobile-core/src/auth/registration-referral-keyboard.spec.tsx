import { act, fireEvent, render } from "@testing-library/react-native";
import { DeviceEventEmitter, ScrollView } from "react-native";

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

const keyboardShown = () =>
  act(async () => {
    DeviceEventEmitter.emit("keyboardDidShow", {
      endCoordinates: { height: 336, screenX: 0, screenY: 508, width: 402 },
    });
  });

async function openReferral() {
  const scrollToEnd = jest
    .spyOn(ScrollView.prototype as { scrollToEnd: () => void }, "scrollToEnd")
    .mockImplementation(() => undefined);
  const screen = await render(<AuthenticationFlow api={createApiMock()} />);
  await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
  await fireEvent.press(screen.getByRole("button", { name: "¿Tienes un código de referido?" }));
  return { scrollToEnd, screen };
}

// The testing session on a 402 pt iPhone (walkthrough n.º 6, C01b3): the
// keyboard covered the open code field and «Código de Lucía» under it, and
// nothing scrolled. The field sits at the end of the form, so the form
// scrolls to its end while that field has the keyboard.
describe("«Crea tu cuenta» with the keyboard on the referral code", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("scrolls the code field and its note above the keyboard", async () => {
    const { screen, scrollToEnd } = await openReferral();

    await fireEvent(screen.getByLabelText("Código de referido"), "focus");
    await keyboardShown();

    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it("scrolls there too when the keyboard was already up for another field", async () => {
    const { screen, scrollToEnd } = await openReferral();
    await fireEvent(screen.getByLabelText("Nombre"), "focus");
    await keyboardShown();
    scrollToEnd.mockClear();

    await fireEvent(screen.getByLabelText("Código de referido"), "focus");

    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it("leaves the other fields where the system puts them", async () => {
    const { screen, scrollToEnd } = await openReferral();

    await fireEvent(screen.getByLabelText("Nombre"), "focus");
    await keyboardShown();

    expect(scrollToEnd).not.toHaveBeenCalled();
  });
});
