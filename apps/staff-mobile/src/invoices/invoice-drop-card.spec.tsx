import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { InvoiceDropCard } from "./invoice-cards";

const noop = () => undefined;

// E-D19: the drop box has a double outline, a solid 1.5 pt line at its edge
// and a dashed one 6 pt inside it, both 400.
describe("E-D19 invoice drop box", () => {
  it("draws a solid edge with a dashed line 6 pt inside it", async () => {
    const screen = await render(<InvoiceDropCard busy={false} onPress={noop} />);
    const box = screen.getByRole("button", { name: "Sube la factura emitida" });
    expect(StyleSheet.flatten(box.props.style)).toMatchObject({
      borderColor: "#CDA697",
      borderRadius: 20,
      borderWidth: 1.5,
    });
    expect(StyleSheet.flatten(box.props.style).borderStyle ?? "solid").toBe("solid");

    const dashed = screen.getByTestId("invoice-drop-dashes");
    expect(StyleSheet.flatten(dashed.props.style)).toMatchObject({
      borderColor: "#CDA697",
      borderStyle: "dashed",
      borderWidth: 1.5,
      // 6 pt from the outer edge, measured inside the 1.5 pt solid line.
      bottom: 4.5,
      left: 4.5,
      position: "absolute",
      right: 4.5,
      top: 4.5,
    });
    expect(dashed.props.pointerEvents).toBe("none");
  });
});
