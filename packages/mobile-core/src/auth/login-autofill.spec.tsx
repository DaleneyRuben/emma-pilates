import { act, fireEvent, render } from "@testing-library/react-native";

import { LoginScreen } from "./login-screen";

// Walkthrough n.º 5 (C01q, C01r): on a phone that can use Face ID or a
// fingerprint, Login offers only that after the first sign-in, never the
// system's «Save password?» on top of it. Without biometrics the system may
// keep offering to save the password.
describe("Login and the system's password autofill", () => {
  it("turns autofill and saving off where biometrics can be used", async () => {
    const screen = await render(<LoginScreen passwordAutofill={false} />);

    for (const label of ["Correo electrónico", "Contraseña"]) {
      expect(screen.getByLabelText(label)).toHaveProp("autoComplete", "off");
      expect(screen.getByLabelText(label)).toHaveProp("textContentType", "none");
      expect(screen.getByLabelText(label)).toHaveProp("importantForAutofill", "no");
    }
  });

  it("keeps autofill where the phone has no biometrics", async () => {
    const screen = await render(<LoginScreen passwordAutofill />);

    expect(screen.getByLabelText("Correo electrónico")).toHaveProp("autoComplete", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveProp("autoComplete", "current-password");
    expect(screen.getByLabelText("Contraseña")).not.toHaveProp("importantForAutofill", "no");
  });

  // Testing session (#5, iOS 26): iOS still offers «Save Password?» when a
  // filled password field leaves the screen after a sign-in, autofill off or
  // not. The field is emptied as she signs in, and restored if refused.
  it("empties the password as she signs in where biometrics can be used", async () => {
    let answer: (result: { status: "rejected" } | undefined) => void = () => undefined;
    const onSubmit = jest.fn(
      () => new Promise<{ status: "rejected" } | undefined>((resolve) => (answer = resolve)),
    );
    const screen = await render(<LoginScreen onSubmit={onSubmit} passwordAutofill={false} />);
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "lucia@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "emma-local-2026");

    await act(async () => {
      fireEvent.press(screen.getByTestId("login-submit"));
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: "lucia@example.com",
      password: "emma-local-2026",
    });
    expect(screen.getByLabelText("Contraseña")).toHaveProp("value", "");
    await act(async () => answer({ status: "rejected" }));
    expect(screen.getByLabelText("Contraseña")).toHaveProp("value", "emma-local-2026");
  });

  it("leaves the password alone where the phone has no biometrics", async () => {
    const onSubmit = jest.fn(() => new Promise<undefined>(() => undefined));
    const screen = await render(<LoginScreen onSubmit={onSubmit} passwordAutofill />);
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "lucia@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "emma-local-2026");

    await act(async () => {
      fireEvent.press(screen.getByTestId("login-submit"));
    });

    expect(screen.getByLabelText("Contraseña")).toHaveProp("value", "emma-local-2026");
  });
});
