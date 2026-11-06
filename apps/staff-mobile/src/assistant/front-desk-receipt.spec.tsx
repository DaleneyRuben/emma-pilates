import { fireEvent, render } from "@testing-library/react-native";

import { FrontDeskReceiptCard } from "./front-desk-receipt-card";

// Walkthrough 21: the receipt waits on S10 until «Enviar comprobante».
// Walkthrough 2 n.º 38 (design follow-up 254 § 2): it can come from the
// camera or from the gallery, for one the Client sent by WhatsApp.
describe("front-desk receipt", () => {
  it("offers the camera and the gallery until a receipt is chosen", async () => {
    const onChoose = jest.fn();
    const screen = await render(<FrontDeskReceiptCard onChoose={onChoose} receipt={null} />);

    expect(screen.getByText("Comprobante")).toBeOnTheScreen();
    expect(
      screen.getByText("Fotografíalo o elígelo de la galería si llegó por WhatsApp"),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Fotografiar comprobante" }));
    await fireEvent.press(screen.getByRole("button", { name: "Elegir de la galería" }));
    expect(onChoose.mock.calls).toEqual([["camera"], ["library"]]);
  });

  it("says the chosen receipt is not sent yet and lets her change it", async () => {
    const onChoose = jest.fn();
    const screen = await render(
      <FrontDeskReceiptCard onChoose={onChoose} receipt={{ imageAssetId: "asset-1" }} />,
    );

    expect(screen.getByText("Comprobante listo")).toBeOnTheScreen();
    expect(screen.getByText("Todavía no se envió")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Elegir de la galería" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Elegir de la galería" }));
    expect(onChoose).toHaveBeenCalledWith("library");
  });
});
