import { fireEvent, render } from "@testing-library/react-native";

import {
  Chip,
  ExceptionPill,
  FormErrorSummary,
  FormField,
  IconRow,
  IconRowGroup,
  NoticeRow,
  PersonAvatar,
  PhoneField,
  SeatPill,
} from "../index";
import { bolivia } from "../account/phone-number";
import { textVariants } from "./type-scale";

const hidden = { includeHiddenElements: true };

// FIX-089 (BotonAPiezas, owner 2026-11-19): the shared pieces of palette B.
describe("Chip", () => {
  it("fills the selected chip in 600 with a white compacto label", async () => {
    const screen = await render(<Chip label="Hoy" onPress={jest.fn()} selected />);

    expect(screen.getByRole("button", { name: "Hoy" })).toHaveStyle({
      backgroundColor: "#93615D",
      minHeight: 38,
    });
    expect(screen.getByRole("button", { name: "Hoy" })).toBeSelected();
    expect(screen.getByText("Hoy")).toHaveStyle({ ...textVariants.compacto, color: "#FFFBFB" });
  });

  it("outlines the unselected chip in Arcilla on Crema and reaches 44 pt", async () => {
    const onPress = jest.fn();
    const screen = await render(<Chip label="Mañana" onPress={onPress} selected={false} />);

    const chip = screen.getByRole("button", { name: "Mañana" });
    expect(chip).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderColor: "#CDA697",
      borderWidth: 1.5,
    });
    expect(chip).toHaveProp("hitSlop", { bottom: 3, left: 0, right: 0, top: 3 });
    // Follow-up 285, rule 4: the same weight selected or not.
    expect(screen.getByText("Mañana")).toHaveStyle({ ...textVariants.compacto, color: "#93615D" });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
});

describe("ExceptionPill", () => {
  it("says the exception in ink pastilla on 50", async () => {
    const screen = await render(<ExceptionPill>Por vencer</ExceptionPill>);

    expect(screen.getByTestId("exception-pill")).toHaveStyle({ backgroundColor: "#FEF6F2" });
    expect(screen.getByText("Por vencer")).toHaveStyle({
      ...textVariants.pastilla,
      color: "#93615D",
    });
  });
});

describe("SeatPill", () => {
  it("says the places as plain text, never a pill", async () => {
    const screen = await render(<SeatPill>4 de 8 lugares</SeatPill>);

    expect(screen.getByTestId("seat-pill")).not.toHaveStyle({ backgroundColor: "#E7CCBF" });
    expect(screen.getByText("4 de 8 lugares")).toHaveStyle({ color: "#93615D" });
  });
});

describe("FormErrorSummary (FormB)", () => {
  it("counts what is missing on Rubor and lists the fields", async () => {
    const screen = await render(<FormErrorSummary fields={["Clases", "Precio"]} />);

    expect(screen.getByTestId("form-error-summary")).toHaveStyle({ backgroundColor: "#FEF6F2" });
    expect(screen.getByText("Faltan 2 datos para guardar")).toHaveStyle(
      textVariants["titulo-fila"],
    );
    expect(screen.getByText("Clases · Precio")).toHaveStyle(textVariants.cuerpo);
  });

  it("names another action than saving", async () => {
    const screen = await render(
      <FormErrorSummary action="enviar" fields={["NIT", "Razón social"]} />,
    );

    expect(screen.getByText("Faltan 2 datos para enviar")).toBeOnTheScreen();
  });

  it("speaks in the singular for one field", async () => {
    const screen = await render(<FormErrorSummary fields={["Nombre"]} />);

    expect(screen.getByText("Falta 1 dato para guardar")).toBeOnTheScreen();
  });

  it("draws nothing while nothing is missing", async () => {
    const screen = await render(<FormErrorSummary fields={[]} />);

    expect(screen.queryByTestId("form-error-summary")).toBeNull();
  });
});

describe("FormField (FormB)", () => {
  it("labels the field in compacto-600 and gives the example as a secundario hint", async () => {
    const screen = await render(<FormField hint="Ej.: 77712345" label="Celular" />);

    expect(screen.getByText("Celular")).toHaveStyle(textVariants["compacto-600"]);
    expect(screen.getByText("Ej.: 77712345")).toHaveStyle(textVariants.secundario);
    expect(screen.getByLabelText("Celular")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderColor: "#CDA697",
      borderRadius: 14,
      borderWidth: 1.5,
      minHeight: 52,
    });
  });

  it("marks an invalid field with a 2 pt Rosa profundo border and a secundario alert", async () => {
    const screen = await render(<FormField error="Falta este dato" label="Clases" />);

    expect(screen.getByLabelText("Clases")).toHaveStyle({ borderColor: "#93615D", borderWidth: 2 });
    expect(screen.getByRole("alert")).toHaveTextContent("Falta este dato");
    expect(screen.getByText("Falta este dato")).toHaveStyle(textVariants.secundario);
  });

  it("never shows dots as a password placeholder", async () => {
    const screen = await render(
      <FormField label="Contraseña" placeholder="••••••" secureTextEntry />,
    );

    expect(screen.getByLabelText("Contraseña")).not.toHaveProp("placeholder", "••••••");
  });
});

describe("optional fields (FormB)", () => {
  it("draws «(opcional)» in regular compacto after the label", async () => {
    const screen = await render(<FormField label="Nota" optional />);

    expect(screen.getByText("(opcional)")).toHaveStyle(textVariants.compacto);
    expect(screen.getByLabelText("Nota (opcional)")).toBeOnTheScreen();
  });
});

describe("PhoneField (FormB)", () => {
  it("labels like every field and marks an error with 2 pt and a secundario alert", async () => {
    const screen = await render(
      <PhoneField
        error="Escribe 8 dígitos."
        onChange={jest.fn()}
        value={{ country: bolivia, digits: "7" }}
      />,
    );

    expect(screen.getByText("Celular")).toHaveStyle(textVariants["compacto-600"]);
    expect(screen.getByRole("alert")).toHaveTextContent("Escribe 8 dígitos.");
    expect(screen.getByText("Escribe 8 dígitos.")).toHaveStyle(textVariants.secundario);
    expect(screen.getByTestId("phone-field-box")).toHaveStyle({
      borderColor: "#93615D",
      borderWidth: 2,
    });
  });
});

describe("no tinted discs behind icons", () => {
  it("draws icon rows without a disc", async () => {
    const screen = await render(
      <IconRowGroup>
        <IconRow icon="pin" label="Sucursal" value="Achumani" />
      </IconRowGroup>,
    );

    expect(screen.queryByTestId("icon-row-disc", hidden)).toBeNull();
  });

  it("draws a notice without a disc", async () => {
    const screen = await render(<NoticeRow message="Esto no se puede deshacer." />);

    expect(screen.queryByTestId("notice-row-disc", hidden)).toBeNull();
  });
});

describe("PersonAvatar", () => {
  it("draws white pastilla initials on a 600 circle", async () => {
    const screen = await render(<PersonAvatar name="Carla Prueba" photoUri={null} size={40} />);

    expect(screen.getByText("CP")).toHaveStyle({ ...textVariants.pastilla, color: "#FFFBFB" });
    expect(screen.toJSON()).toHaveStyle({ backgroundColor: "#93615D" });
  });
});
