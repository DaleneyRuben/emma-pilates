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
  StateScreen,
} from "../index";
import { bolivia } from "../account/phone-number";

const hidden = { includeHiddenElements: true };

// FIX-089 (BotonAPiezas, owner 2026-11-19): the shared pieces of palette B.
describe("Chip", () => {
  it("fills the selected chip in Rosa profundo with a Crema label", async () => {
    const screen = await render(<Chip label="Hoy" onPress={jest.fn()} selected />);

    expect(screen.getByRole("button", { name: "Hoy" })).toHaveStyle({
      backgroundColor: "#93615D",
      minHeight: 38,
    });
    expect(screen.getByRole("button", { name: "Hoy" })).toBeSelected();
    expect(screen.getByText("Hoy")).toHaveStyle({
      color: "#F9F4F2",
      fontFamily: "WorkSans_600SemiBold",
    });
  });

  it("outlines the unselected chip in Arcilla on Crema and reaches 44 pt", async () => {
    const onPress = jest.fn();
    const screen = await render(<Chip label="Mañana" onPress={onPress} selected={false} />);

    const chip = screen.getByRole("button", { name: "Mañana" });
    expect(chip).toHaveStyle({
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
      borderWidth: 1,
    });
    expect(chip).toHaveProp("hitSlop", { bottom: 3, left: 0, right: 0, top: 3 });
    expect(screen.getByText("Mañana")).toHaveStyle({ color: "#93615D" });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
});

describe("ExceptionPill", () => {
  it("says the exception in bold Rosa profundo on Rubor", async () => {
    const screen = await render(<ExceptionPill>Por vencer</ExceptionPill>);

    expect(screen.getByTestId("exception-pill")).toHaveStyle({ backgroundColor: "#E7CCBF" });
    expect(screen.getByText("Por vencer")).toHaveStyle({
      color: "#93615D",
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 12,
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

    expect(screen.getByTestId("form-error-summary")).toHaveStyle({ backgroundColor: "#E7CCBF" });
    expect(screen.getByText("Faltan 2 datos para guardar")).toHaveStyle({ fontWeight: "700" });
    expect(screen.getByText("Clases · Precio")).toBeOnTheScreen();
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
  it("labels the field in Work Sans 14 SemiBold and gives the example as a hint below", async () => {
    const screen = await render(<FormField hint="Ej.: 77712345" label="Celular" />);

    expect(screen.getByText("Celular")).toHaveStyle({ fontSize: 14, fontWeight: "600" });
    expect(screen.getByText("Ej.: 77712345")).toHaveStyle({ fontSize: 13 });
    expect(screen.getByLabelText("Celular")).toHaveStyle({
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
      borderWidth: 1,
    });
  });

  it("marks an invalid field with a 2 pt Rosa profundo border and a bold message", async () => {
    const screen = await render(<FormField error="Falta este dato" label="Clases" />);

    expect(screen.getByLabelText("Clases")).toHaveStyle({ borderColor: "#93615D", borderWidth: 2 });
    expect(screen.getByText("Falta este dato")).toHaveStyle({ fontWeight: "700" });
  });

  it("never shows dots as a password placeholder", async () => {
    const screen = await render(
      <FormField label="Contraseña" placeholder="••••••" secureTextEntry />,
    );

    expect(screen.getByLabelText("Contraseña")).not.toHaveProp("placeholder", "••••••");
  });
});

describe("optional fields (FormB)", () => {
  it("draws «(opcional)» at weight 400 after the label", async () => {
    const screen = await render(<FormField label="Nota" optional />);

    expect(screen.getByText("(opcional)")).toHaveStyle({ fontWeight: "400" });
    expect(screen.getByLabelText("Nota (opcional)")).toBeOnTheScreen();
  });
});

describe("PhoneField (FormB)", () => {
  it("labels like every field and marks an error with 2 pt and a bold message", async () => {
    const screen = await render(
      <PhoneField
        error="Escribe 8 dígitos."
        onChange={jest.fn()}
        value={{ country: bolivia, digits: "7" }}
      />,
    );

    expect(screen.getByText("Celular")).toHaveStyle({ fontSize: 14, fontWeight: "600" });
    expect(screen.getByText("Escribe 8 dígitos.")).toHaveStyle({ fontWeight: "700" });
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

  it("draws a state screen's icon without a disc", async () => {
    const screen = await render(<StateScreen icon="calendar" title="Sin clases" />);

    expect(screen.queryByTestId("state-screen-disc", hidden)).toBeNull();
  });

  it("draws a notice without a disc", async () => {
    const screen = await render(<NoticeRow message="Esto no se puede deshacer." />);

    expect(screen.queryByTestId("notice-row-disc", hidden)).toBeNull();
  });
});

describe("PersonAvatar", () => {
  it("draws Crema initials on a Palo de rosa circle", async () => {
    const screen = await render(<PersonAvatar name="Carla Prueba" photoUri={null} size={40} />);

    expect(screen.getByText("CP")).toHaveStyle({ color: "#F9F4F2", fontWeight: "700" });
    expect(screen.toJSON()).toHaveStyle({ backgroundColor: "#B78380" });
  });
});
