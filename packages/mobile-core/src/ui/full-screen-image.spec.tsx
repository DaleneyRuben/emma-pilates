import { fireEvent, render as renderScreen, within } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FullScreenImage } from "./full-screen-image";
import { Text } from "./text";
import { colors } from "./tokens";
import { textVariants } from "./type-scale";

// The viewer's own provider starts from its parent's metrics, as in the app.
const metrics = {
  frame: { height: 874, width: 402, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 62 },
};
const render = (element: ReactElement) =>
  renderScreen(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);

// MOB-062, follow-up 95: the light view of the studio QR.
describe("FullScreenImage", () => {
  // E-D30, C10v: the page title and a «Cerrar» text button share the top row
  // of a white page; the image fills it, with the note under it, on no card.
  it("heads the light view with the page title and a «Cerrar» text button", async () => {
    const screen = await render(
      <FullScreenImage
        label="Factura ampliada"
        note="Pellizca para ampliar."
        onClose={jest.fn()}
        title="Tu factura"
        tone="light"
        uri="data:image/png;base64,AA=="
        visible
      />,
    );

    const title = screen.getByRole("header", { name: "Tu factura" });
    expect(title).toHaveStyle(textVariants["titulo-pagina"]);
    const close = screen.getByRole("button", { name: "Cerrar" });
    expect(within(close).getByText("Cerrar")).toHaveStyle(textVariants.boton);
    const top = within(screen.getByTestId("full-screen-image-top"));
    expect(top.getByText("Tu factura")).toBeOnTheScreen();
    expect(top.getByRole("button", { name: "Cerrar" })).toBeOnTheScreen();
    expect(screen.getByTestId("full-screen-image-page")).toHaveStyle({
      backgroundColor: colors.card,
    });
    expect(screen.queryByTestId("full-screen-image-card")).toBeNull();
    expect(screen.getByLabelText("Factura ampliada")).toHaveStyle({ borderRadius: 16 });
    expect(screen.getByText("Pellizca para ampliar.")).toBeOnTheScreen();
  });

  it("draws the light view's image whole no wider than a phone column", async () => {
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
    // On a tablet the image stops at the 480 pt column instead of filling the screen.
    expect(screen.getByLabelText("Código QR ampliado")).toHaveStyle({ maxWidth: 480 });
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
        banner={<Text variant="destacado">QR guardado en tus fotos.</Text>}
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
