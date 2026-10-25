import { render } from "@testing-library/react-native";

import { PaymentStatusView } from "./payment-status-view";

const hidden = { includeHiddenElements: true };

// UX-006: screen 11 draws a stroked line icon on the semantic disc. The
// hourglass emoji rendered differently on each platform and was the only
// emoji in the product.
describe("PaymentStatusView", () => {
  it.each([
    ["pending", "Pago en revisión", "#C99A4E"],
    ["confirmed", "Pago confirmado", "#7C9473"],
    ["rejected", "Comprobante rechazado", "#B25D4B"],
  ] as const)(
    "draws the %s status as a line icon labelled for VoiceOver",
    async (state, label, disc) => {
      const screen = await render(<PaymentStatusView state={state} />);

      expect(screen.getByLabelText(label)).toBeOnTheScreen();
      expect(screen.getByTestId(`payment-status-icon-${state}`, hidden)).toHaveProp(
        "stroke",
        "#FFFFFF",
      );
      expect(screen.getByTestId(`payment-status-disc-${state}`)).toHaveStyle({
        backgroundColor: disc,
      });
      expect(screen.queryByText(/[⏳⌛✓!]/u)).toBeNull();
    },
  );
});
