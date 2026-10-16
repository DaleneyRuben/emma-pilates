import { fireEvent, render as renderScreen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FullScreenImage } from "./full-screen-image";

// The viewer's own provider starts from its parent's metrics, as in the app.
const metrics = {
  frame: { height: 874, width: 402, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 62 },
};
const render = (element: ReactElement) =>
  renderScreen(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);

// MOB-062, follow-up 95: the light view of the studio QR.
describe("FullScreenImage", () => {
  it("draws the light view's image whole on a card no wider than a phone column", async () => {
    const screen = await render(
      <FullScreenImage
        aspectRatio={0.7}
        label="Código QR ampliado"
        onClose={jest.fn()}
        title="QR del estudio"
        tone="light"
        uri="data:image/png;base64,AA=="
        visible
      />,
    );

    expect(screen.getByLabelText("Código QR ampliado")).toHaveProp("resizeMode", "contain");
    expect(screen.getByLabelText("Código QR ampliado")).toHaveStyle({ aspectRatio: 0.7 });
    // On a tablet the card stops at the 480 pt column instead of filling the screen.
    expect(screen.getByTestId("full-screen-image-card")).toHaveStyle({ maxWidth: 480 });
  });

  it("closes from «Cerrar»", async () => {
    const onClose = jest.fn();
    const screen = await render(
      <FullScreenImage label="Comprobante ampliado" onClose={onClose} uri="data:," visible />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("shows a banner between the top row and the image", async () => {
    const screen = await render(
      <FullScreenImage
        banner={<Text>QR guardado en tus fotos.</Text>}
        label="Código QR ampliado"
        onClose={jest.fn()}
        title="QR del estudio"
        tone="light"
        uri="data:image/png;base64,AA=="
        visible
      />,
    );

    const order = screen
      .getAllByText(/QR del estudio|QR guardado en tus fotos\./)
      .map((node) => node.props.children as string);
    expect(order).toEqual(["QR del estudio", "QR guardado en tus fotos."]);
    expect(screen.getByLabelText("Código QR ampliado")).toBeOnTheScreen();
  });
});
