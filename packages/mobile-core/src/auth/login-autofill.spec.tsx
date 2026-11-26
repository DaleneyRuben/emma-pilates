import { render } from "@testing-library/react-native";

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
});
