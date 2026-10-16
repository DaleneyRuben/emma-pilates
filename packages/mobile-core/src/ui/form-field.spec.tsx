import { fireEvent, render } from "@testing-library/react-native";

import { FormField } from "./form-field";

// MOB-059, design follow-up 92: every password field carries an eye inside its right end.
describe("FormField password control", () => {
  it("starts hidden with a «Mostrar contraseña» button", async () => {
    const screen = await render(<FormField label="Contraseña" secureTextEntry value="Calma2026" />);

    expect(screen.getByLabelText("Contraseña")).toHaveProp("secureTextEntry", true);
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toBeOnTheScreen();
  });

  it("shows the typed text and offers to hide it again, keeping the value", async () => {
    const screen = await render(<FormField label="Contraseña" secureTextEntry value="Calma2026" />);

    await fireEvent.press(screen.getByRole("button", { name: "Mostrar contraseña" }));

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveProp("secureTextEntry", false);
    expect(input).toHaveProp("value", "Calma2026");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Ocultar contraseña" }));

    expect(screen.getByLabelText("Contraseña")).toHaveProp("secureTextEntry", true);
  });

  it("toggles each field on its own", async () => {
    const screen = await render(
      <>
        <FormField label="Contraseña nueva" secureTextEntry />
        <FormField label="Confirmar contraseña" secureTextEntry />
      </>,
    );

    await fireEvent.press(screen.getAllByRole("button", { name: "Mostrar contraseña" })[0]);

    expect(screen.getByLabelText("Contraseña nueva")).toHaveProp("secureTextEntry", false);
    expect(screen.getByLabelText("Confirmar contraseña")).toHaveProp("secureTextEntry", true);
  });

  it("keeps typed text clear of the eye", async () => {
    const screen = await render(<FormField label="Contraseña" secureTextEntry />);

    expect(screen.getByLabelText("Contraseña")).toHaveStyle({ paddingRight: 52 });
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toHaveStyle({
      height: 44,
      width: 44,
    });
  });

  it("disables the eye with a disabled field", async () => {
    const screen = await render(<FormField editable={false} label="Contraseña" secureTextEntry />);

    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toBeDisabled();
  });

  it("draws no eye on a field that is not a password", async () => {
    const screen = await render(<FormField label="Correo electrónico" />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
