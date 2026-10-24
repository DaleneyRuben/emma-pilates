import { fireEvent, render } from "@testing-library/react-native";
import { View } from "react-native";

import { FrontDeskReceiptCard } from "./front-desk-receipt-card";
import { InvoiceDataCard, invoiceChoiceFrom } from "./invoice-data-card";

describe("front-desk receipt and invoice card", () => {
  it("lets the Assistant photograph a receipt and leave the sale without an invoice", async () => {
    const onPhotograph = jest.fn();
    const screen = await render(
      <View>
        <FrontDeskReceiptCard onPhotograph={onPhotograph} receipt={null} />
        <InvoiceDataCard onChange={() => undefined} value={invoiceChoiceFrom()} />
      </View>,
    );

    expect(screen.getByText("Datos para la factura")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sin factura" })).toBeSelected();
    fireEvent.press(screen.getByRole("button", { name: "Fotografiar comprobante" }));
    expect(onPhotograph).toHaveBeenCalledTimes(1);
  });
});
