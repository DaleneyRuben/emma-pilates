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

  // FIX-089: the destructive confirmation takes the secondary look, never red.
  it("draws the Lora title, the note, the outlined destructive action and the quiet dismiss link", async () => {
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
    expect(confirm).toHaveStyle({ backgroundColor: "#F9F4F2", borderColor: "#93615D" });
    expect(sheet.getByText("Cerrar sesión")).toHaveStyle({ color: "#93615D" });
    expect(sheet.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
  });

  it("draws the solid primary action for a non-destructive confirmation", async () => {
    const screen = await renderSheet({
      confirmLabel: "Ver como Emma",
      title: "¿Ver la app como Emma Vargas?",
      tone: "primary",
    });

    expect(screen.getByRole("button", { name: "Ver como Emma" })).toHaveStyle({
      backgroundColor: "#93615D",
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

  it("leaves the note out when the facts are rows (C05c)", async () => {
    const screen = await renderSheet({
      children: <Text>La clase vuelve a tu plan</Text>,
      note: undefined,
    });

    expect(screen.getByText("La clase vuelve a tu plan")).toBeOnTheScreen();
    expect(screen.queryAllByText("")).toHaveLength(0);
  });

  it("falls back to «Volver» as the dismiss label", async () => {
    const screen = await renderSheet({ dismissLabel: undefined });

    expect(screen.getByRole("button", { name: "Volver" })).toBeOnTheScreen();
  });

  // Walkthrough finding 113: S28's sheet adds «Marcar contactada» under its action.
  it("draws an outlined second action under the main one", async () => {
    const onSecondary = jest.fn();
    const screen = await renderSheet({
      secondaryAction: { label: "Marcar contactada", onPress: onSecondary },
    });

    const second = screen.getByRole("button", { name: "Marcar contactada" });
    await fireEvent.press(second);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("leaves the second action out unless given", async () => {
    const screen = await renderSheet();

    expect(screen.queryByRole("button", { name: "Marcar contactada" })).toBeNull();
  });

  it("locks the main action and the way back while the second action runs", async () => {
    const onDismiss = jest.fn();
    const screen = await renderSheet({
      onDismiss,
      secondaryAction: { busy: true, label: "Marcar contactada", onPress: jest.fn() },
    });

    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await fireEvent(screen.getByTestId("logout-sheet-modal"), "requestClose");
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
