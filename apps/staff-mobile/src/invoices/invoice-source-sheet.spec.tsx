import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { Platform } from "react-native";

import { InvoiceSourceSheet, type InvoiceSource } from "./invoice-source-sheet";

function Harness({ onChoose }: { onChoose: (source: InvoiceSource) => void }) {
  const [visible, setVisible] = useState(true);
  return (
    <InvoiceSourceSheet onChoose={onChoose} onDismiss={() => setVisible(false)} visible={visible} />
  );
}

const originalOs = Platform.OS;
const setOs = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
};

// Walkthrough n.º 25: iOS cannot present the picker while this sheet is still
// closing, so the picker failed and the screen blamed the connection.
describe("InvoiceSourceSheet", () => {
  afterEach(() => {
    setOs(originalOs);
  });

  it("offers an image or a PDF, and no camera (owner, 26 Nov)", async () => {
    const screen = await render(<Harness onChoose={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Elegir una imagen" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Elegir un PDF" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Tomar foto" })).not.toBeOnTheScreen();
  });

  it("on iOS opens the picker only once the sheet has finished closing", async () => {
    setOs("ios");
    const onChoose = jest.fn();
    const screen = await render(<Harness onChoose={onChoose} />);
    const dismissed: () => void = screen.getByTestId("invoice-source-sheet").props.onDismiss;

    await fireEvent.press(screen.getByRole("button", { name: "Elegir un PDF" }));
    expect(onChoose).not.toHaveBeenCalled();

    await act(() => dismissed());
    expect(onChoose).toHaveBeenCalledWith("document");

    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("on iOS still opens the picker if the close is never reported", async () => {
    setOs("ios");
    const onChoose = jest.fn();
    const screen = await render(<Harness onChoose={onChoose} />);

    await fireEvent.press(screen.getByRole("button", { name: "Elegir una imagen" }));
    expect(onChoose).not.toHaveBeenCalled();

    await waitFor(() => expect(onChoose).toHaveBeenCalledWith("library"));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("on Android opens the picker straight away", async () => {
    setOs("android");
    const onChoose = jest.fn();
    const screen = await render(<Harness onChoose={onChoose} />);

    await fireEvent.press(screen.getByRole("button", { name: "Elegir una imagen" }));

    expect(onChoose).toHaveBeenCalledWith("library");
  });
});
