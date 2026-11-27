import { fireEvent, render } from "@testing-library/react-native";

import { ReceiptRow } from "./receipt-row";

const handlers = () => ({ onAttach: jest.fn(), onOpen: jest.fn(), onRemove: jest.fn() });

// Walkthrough n.º 7 and 23 (C10u, C10b): the receipt uploads with its
// progress, then reads «Comprobante listo» with a visible «Cambiar», the ×,
// and a thumbnail that opens it big; the row itself is no longer a button.
describe("ReceiptRow", () => {
  it("offers to choose a receipt", async () => {
    const actions = handlers();
    const screen = await render(<ReceiptRow {...actions} receipt={{ status: "empty" }} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    expect(actions.onAttach).toHaveBeenCalledTimes(1);
  });

  it("shows the upload's progress", async () => {
    const screen = await render(
      <ReceiptRow
        {...handlers()}
        receipt={{ localUri: "file:///r.jpg", progress: 0.6, status: "uploading" }}
      />,
    );

    expect(screen.getByText("Subiendo comprobante")).toBeOnTheScreen();
    expect(screen.getByText("60 %")).toBeOnTheScreen();
    expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ max: 100, min: 0, now: 60 });
    expect(screen.queryByRole("button", { name: "Cambiar" })).toBeNull();
  });

  it("holds the ready receipt with Cambiar, the × and its thumbnail", async () => {
    const actions = handlers();
    const screen = await render(
      <ReceiptRow {...actions} receipt={{ localUri: "file:///r.jpg", status: "ready" }} />,
    );

    expect(screen.getByText("Comprobante listo")).toBeOnTheScreen();
    expect(screen.queryByText(/toca para cambiarlo/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Comprobante listo/ })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Quitar comprobante" }));
    await fireEvent.press(screen.getByRole("button", { name: "Ver comprobante en grande" }));

    expect(actions.onAttach).toHaveBeenCalledTimes(1);
    expect(actions.onRemove).toHaveBeenCalledTimes(1);
    expect(actions.onOpen).toHaveBeenCalledTimes(1);
  });

  // Testing session: «Comprobante l…» on a 402 pt iPhone. The board's
  // measures leave the title whole: 14 pt row sides, «Cambiar» in 14 pt bold
  // with 14 pt sides, 8 pt between it and the ×, and the title shrinks a
  // little rather than cut on a narrower phone or a larger text size.
  it("lays the ready row out as C10b so the title is never cut", async () => {
    const screen = await render(
      <ReceiptRow {...handlers()} receipt={{ localUri: "file:///r.jpg", status: "ready" }} />,
    );

    expect(screen.getByTestId("payment-receipt")).toHaveStyle({
      paddingHorizontal: 14,
      paddingVertical: 12,
    });
    expect(screen.getByText("Cambiar")).toHaveStyle({ fontSize: 14 });
    expect(screen.getByRole("button", { name: "Cambiar" })).toHaveStyle({
      borderRadius: 12,
      paddingHorizontal: 14,
    });
    expect(screen.getByTestId("receipt-ready-actions")).toHaveStyle({
      flexDirection: "row",
      gap: 8,
    });
    const title = screen.getByText("Comprobante listo");
    expect(title).toHaveProp("adjustsFontSizeToFit", true);
    expect(title).toHaveProp("numberOfLines", 1);
  });
});
