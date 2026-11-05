import { fireEvent, render } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    register: jest.fn().mockResolvedValue({
      email: "lucia@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    }),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn(),
  } as AuthenticationApi;
}

async function openAndFill(api: AuthenticationApi) {
  const screen = await render(<AuthenticationFlow api={api} />);
  await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Fernández");
  await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "lucia@example.com");
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "pilates2026");
  await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "pilates2026");
  await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
  return screen;
}

// FIX-037 (owner, 2026-11-04/05): the mobile number is required when a
// Client registers herself; Bolivia +591 is preselected (C01b, follow-up 236).
describe("Client registration phone (C01b)", () => {
  it("asks for the mobile with Bolivia preselected and the WhatsApp helper", async () => {
    const screen = await openAndFill(createApiMock());

    expect(screen.getByRole("button", { name: "País: Bolivia, +591" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Celular")).toHaveProp("placeholder", "8 dígitos");
    expect(screen.getByText("Te escribimos por WhatsApp si hace falta.")).toBeOnTheScreen();
  });

  it("refuses to register without a mobile", async () => {
    const api = createApiMock();
    const screen = await openAndFill(api);

    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      screen.getByRole("alert", {
        name: "Escribe tu celular. Lo necesitamos para escribirte por WhatsApp.",
      }),
    ).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("refuses a Bolivian number that is not a mobile", async () => {
    const api = createApiMock();
    const screen = await openAndFill(api);

    await fireEvent.changeText(screen.getByLabelText("Celular"), "5123456");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      screen.getByRole("alert", {
        name: "Un celular de Bolivia tiene 8 dígitos y empieza con 6 o 7.",
      }),
    ).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("sends a Bolivian mobile as «+591 XXXXXXXX»", async () => {
    const api = createApiMock();
    const screen = await openAndFill(api);

    await fireEvent.changeText(screen.getByLabelText("Celular"), "7123 4567");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(api.register).toHaveBeenCalledWith(expect.objectContaining({ phone: "+591 71234567" }));
  });

  it("sends a number from another country with its code", async () => {
    const api = createApiMock();
    const screen = await openAndFill(api);

    await fireEvent.press(screen.getByRole("button", { name: "País: Bolivia, +591" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Perú, +51" })[0]);
    await fireEvent.changeText(screen.getByLabelText("Celular"), "912 345 678");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(api.register).toHaveBeenCalledWith(expect.objectContaining({ phone: "+51 912345678" }));
  });
});
