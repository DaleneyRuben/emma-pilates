import { useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { bolivia, phoneCountryByIso } from "../account/phone-number";
import { PhoneField, type PhoneValue } from "./phone-field";

function Harness({ initial, error }: { initial?: PhoneValue; error?: string }) {
  const [value, setValue] = useState<PhoneValue>(initial ?? { country: bolivia, digits: "" });
  return (
    <>
      <PhoneField
        error={error}
        helper="Te escribimos por WhatsApp si hace falta."
        onChange={setValue}
        value={value}
      />
      <PhoneField label="Espejo" onChange={() => undefined} value={value} />
    </>
  );
}

// FIX-037 (DES-006, follow-up 236, proposal A): one field with a tappable
// «🇧🇴 +591» prefix that opens the country list.
describe("PhoneField", () => {
  it("starts on Bolivia with an 8-digit placeholder and the helper", async () => {
    const screen = await render(<Harness />);

    expect(screen.getAllByRole("button", { name: "País: Bolivia, +591" })).toHaveLength(2);
    expect(screen.getByLabelText("Celular")).toHaveProp("placeholder", "8 dígitos");
    expect(screen.getByText("Te escribimos por WhatsApp si hace falta.")).toBeOnTheScreen();
  });

  it("passes the typed digits up", async () => {
    const screen = await render(<Harness />);

    await fireEvent.changeText(screen.getByLabelText("Celular"), "70712345");

    expect(screen.getByLabelText("Espejo")).toHaveProp("value", "70712345");
  });

  it("opens the country list from the prefix and switches to the picked country", async () => {
    const screen = await render(<Harness initial={{ country: bolivia, digits: "912345678" }} />);

    await fireEvent.press(screen.getAllByRole("button", { name: "País: Bolivia, +591" })[0]);

    expect(screen.getByText("Elige el país")).toBeOnTheScreen();
    expect(screen.getByText("Frecuentes")).toBeOnTheScreen();
    expect(screen.getByText("Todos los países")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Bolivia, +591", selected: true })).toBeOnTheScreen();

    await fireEvent.press(screen.getAllByRole("button", { name: "Perú, +51" })[0]);

    expect(screen.queryByText("Elige el país")).not.toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "País: Perú, +51" })).toHaveLength(2);
    expect(screen.getByLabelText("Celular")).toHaveProp("placeholder", "9 dígitos");
    expect(screen.getByLabelText("Celular")).toHaveProp("value", "912345678");
  });

  it("filters the list by name or code and closes on «Cancelar»", async () => {
    const screen = await render(<Harness />);

    await fireEvent.press(screen.getAllByRole("button", { name: "País: Bolivia, +591" })[0]);
    await fireEvent.changeText(screen.getByLabelText("Buscar país o código"), "+595");

    expect(screen.getByRole("button", { name: "Paraguay, +595" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Perú, +51" })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Elige el país")).not.toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "País: Bolivia, +591" })).toHaveLength(2);
  });

  it("shows the error under the field instead of the helper", async () => {
    const screen = await render(
      <Harness
        error="Un celular de Perú tiene 9 dígitos y empieza con 9."
        initial={{ country: phoneCountryByIso("PE"), digits: "81234" }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Un celular de Perú tiene 9 dígitos y empieza con 9.",
    );
    expect(screen.queryByText("Te escribimos por WhatsApp si hace falta.")).not.toBeOnTheScreen();
  });
});
