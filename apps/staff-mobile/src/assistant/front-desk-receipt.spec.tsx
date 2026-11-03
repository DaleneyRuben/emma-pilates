import { fireEvent, render } from "@testing-library/react-native";

import { FrontDeskReceiptCard } from "./front-desk-receipt-card";

// Walkthrough 21: the photo waits on S10 until «Enviar comprobante».
describe("front-desk receipt", () => {
  it("offers the camera until a receipt is photographed", async () => {
    const onPhotograph = jest.fn();
    const screen = await render(
      <FrontDeskReceiptCard onPhotograph={onPhotograph} receipt={null} />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Fotografiar comprobante" }));
    expect(onPhotograph).toHaveBeenCalledTimes(1);
  });

  it("says the photographed receipt is not sent yet and lets her retake it", async () => {
    const onPhotograph = jest.fn();
    const screen = await render(
      <FrontDeskReceiptCard onPhotograph={onPhotograph} receipt={{ imageAssetId: "asset-1" }} />,
    );

    expect(screen.getByText("Comprobante fotografiado")).toBeOnTheScreen();
    expect(screen.getByText("Todavía no se envió")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Fotografiar otra vez" }));
    expect(onPhotograph).toHaveBeenCalledTimes(1);
  });
});
