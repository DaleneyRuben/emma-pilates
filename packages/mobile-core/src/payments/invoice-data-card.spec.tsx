import { fireEvent, render } from "@testing-library/react-native";
import { useState } from "react";

import {
  InvoiceDataCard,
  invoiceChoiceFrom,
  invoiceDataPayload,
  type InvoiceChoice,
} from "./invoice-data-card";

const ana = { taxId: "4567891", name: "Ana Pérez" };

function Harness({ initial }: { initial: InvoiceChoice }) {
  const [choice, setChoice] = useState(initial);
  return (
    <InvoiceDataCard
      noInvoiceNote="Tu compra se registra sin datos de factura."
      onChange={setChoice}
      prefilledNote="Usamos los datos de tu última compra. Puedes cambiarlos."
      value={choice}
    />
  );
}

// PAY-007, design follow-ups 145 and 146: NIT or CI and a name, or «Sin factura».
describe("the invoice choice", () => {
  it("starts «Sin factura» when there is nothing to prefill", () => {
    expect(invoiceChoiceFrom(null)).toEqual({
      wantsInvoice: false,
      taxId: "",
      name: "",
      prefilled: false,
    });
    expect(invoiceDataPayload(invoiceChoiceFrom(null))).toBeNull();
  });

  it("starts «Con factura» with the last sale's data", () => {
    const choice = invoiceChoiceFrom(ana);

    expect(choice).toEqual({ wantsInvoice: true, ...ana, prefilled: true });
    expect(invoiceDataPayload(choice)).toEqual(ana);
  });

  it("sends the data trimmed, and nothing for «Sin factura» even with typed data", () => {
    expect(
      invoiceDataPayload({
        wantsInvoice: true,
        taxId: " 4567891-1A ",
        name: " Ana Pérez ",
        prefilled: false,
      }),
    ).toEqual({ taxId: "4567891-1A", name: "Ana Pérez" });
    expect(invoiceDataPayload({ ...invoiceChoiceFrom(ana), wantsInvoice: false })).toBeNull();
  });

  it.each([
    ["a missing NIT or CI", { taxId: " ", name: "Ana" }],
    ["a missing name", { taxId: "4567891", name: "" }],
    ["a NIT or CI without digits", { taxId: "ABC", name: "Ana" }],
    ["a NIT or CI with symbols", { taxId: "45/67", name: "Ana" }],
  ])("is incomplete with %s", (_case, data) => {
    expect(invoiceDataPayload({ wantsInvoice: true, ...data, prefilled: false })).toBe(
      "incomplete",
    );
  });
});

describe("InvoiceDataCard", () => {
  it("shows the «Sin factura» note and no fields when no invoice is wanted", async () => {
    const screen = await render(<Harness initial={invoiceChoiceFrom(null)} />);

    expect(screen.getByText("Datos para la factura")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sin factura" })).toBeSelected();
    expect(screen.getByText("Tu compra se registra sin datos de factura.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("NIT o CI")).toBeNull();
  });

  it("asks for the NIT or CI and the name with «Con factura»", async () => {
    const screen = await render(<Harness initial={invoiceChoiceFrom(null)} />);

    await fireEvent.press(screen.getByRole("button", { name: "Con factura" }));
    await fireEvent.changeText(screen.getByLabelText("NIT o CI"), "4567891");
    await fireEvent.changeText(screen.getByLabelText("Nombre o razón social"), "Ana Pérez");

    expect(screen.getByRole("button", { name: "Con factura" })).toBeSelected();
    expect(screen.getByLabelText("NIT o CI")).toHaveProp("value", "4567891");
    expect(screen.getByLabelText("Nombre o razón social")).toHaveProp("value", "Ana Pérez");
    expect(screen.queryByText("Tu compra se registra sin datos de factura.")).toBeNull();
    expect(screen.queryByText(/última compra/)).toBeNull();
  });

  it("says where prefilled data came from", async () => {
    const screen = await render(<Harness initial={invoiceChoiceFrom(ana)} />);

    expect(screen.getByLabelText("NIT o CI")).toHaveProp("value", "4567891");
    expect(
      screen.getByText("Usamos los datos de tu última compra. Puedes cambiarlos."),
    ).toBeOnTheScreen();
  });

  it("explains a NIT or CI it cannot accept", async () => {
    const screen = await render(<Harness initial={invoiceChoiceFrom(ana)} />);

    await fireEvent.changeText(screen.getByLabelText("NIT o CI"), "45/67");

    expect(screen.getByText("Usa solo números, letras y guiones.")).toBeOnTheScreen();
  });
});
