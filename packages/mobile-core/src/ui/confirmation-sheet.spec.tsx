import { fireEvent, render, within } from "@testing-library/react-native";
import { Text } from "react-native";

import { ConfirmationSheet } from "./confirmation-sheet";

// UX-002: the bottom confirmation sheet 05, 15, S14, S15, S17, S23 and S24 draw,
// in place of the native Alert.alert dialogs.
describe("ConfirmationSheet", () => {
  const renderSheet = (props: Partial<Parameters<typeof ConfirmationSheet>[0]> = {}) =>
    render(
      <ConfirmationSheet
        confirmLabel="Cerrar sesión"
        confirmTestID="logout-confirm"
        dismissLabel="Cancelar"
        note="Vuelves al inicio de sesión y tendrás que entrar de nuevo con tu correo y contraseña."
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
        testID="logout-sheet"
        title="¿Cerrar sesión?"
        visible
        {...props}
      />,
    );

  it("draws the Lora title, the note, the outlined Error action and the quiet dismiss link", async () => {
    const screen = await renderSheet();

    const sheet = within(screen.getByTestId("logout-sheet"));
    expect(sheet.getByText("¿Cerrar sesión?")).toHaveStyle({ fontFamily: "Lora_500Medium" });
    expect(
      sheet.getByText(
        "Vuelves al inicio de sesión y tendrás que entrar de nuevo con tu correo y contraseña.",
      ),
    ).toBeOnTheScreen();
    const confirm = sheet.getByTestId("logout-confirm");
    expect(confirm).toBe(sheet.getByRole("button", { name: "Cerrar sesión" }));
    expect(confirm).toHaveStyle({ borderColor: "#B25D4B" });
    expect(sheet.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
  });

  it("draws the solid primary action for a non-destructive confirmation", async () => {
    const screen = await renderSheet({
      confirmLabel: "Ver como Emma",
      title: "¿Ver la app como Emma Vargas?",
      tone: "primary",
    });

    expect(screen.getByRole("button", { name: "Ver como Emma" })).toHaveStyle({
      backgroundColor: "#B78380",
    });
  });

  it("calls onConfirm and onDismiss from their buttons and the hardware back", async () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();
    const screen = await renderSheet({ onConfirm, onDismiss });

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByTestId("logout-sheet-modal"), "requestClose");
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("keeps the confirming button busy and the dismiss link disabled while the request runs", async () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();
    const screen = await renderSheet({ busy: true, onConfirm, onDismiss });

    const confirm = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(confirm).toBeBusy();
    await fireEvent.press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("renders nothing while hidden and extra lines between the title and the note", async () => {
    const hidden = await renderSheet({ visible: false });
    expect(hidden.queryByText("¿Cerrar sesión?")).toBeNull();

    const screen = await renderSheet({ children: <Text>Reformer · jueves 20</Text> });
    expect(screen.getByText("Reformer · jueves 20")).toBeOnTheScreen();
  });

  it("falls back to «Volver» as the dismiss label", async () => {
    const screen = await renderSheet({ dismissLabel: undefined });

    expect(screen.getByRole("button", { name: "Volver" })).toBeOnTheScreen();
  });
});
