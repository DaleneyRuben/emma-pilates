import type { FieldErrors } from "react-hook-form";
import { invalidFields, missingDataTitle, summaryLabels } from "./form-errors";

describe("invalidFields", () => {
  it("lists every field with an error, nested ones by their dotted path", () => {
    const errors = {
      name: { type: "too_small", message: "Escribe el nombre." },
      rows: [
        undefined,
        { start: { type: "custom", message: "Elige la hora." } },
      ],
      price: { amount: { type: "custom", message: "Escribe el precio." } },
    } as unknown as FieldErrors;

    expect(invalidFields(errors)).toEqual([
      { path: "name", message: "Escribe el nombre." },
      { path: "rows.1.start", message: "Elige la hora." },
      { path: "price.amount", message: "Escribe el precio." },
    ]);
  });

  it("leaves out the form-wide root error, which is not a field", () => {
    const errors = {
      root: { type: "server", message: "No pudimos guardar." },
      address: { type: "too_small", message: "Escribe la dirección." },
    } as unknown as FieldErrors;

    expect(invalidFields(errors)).toEqual([
      { path: "address", message: "Escribe la dirección." },
    ]);
  });

  it("is empty when nothing is wrong", () => {
    expect(invalidFields({})).toEqual([]);
  });
});

describe("summaryLabels", () => {
  const labels = new Map([
    ["name", "Nombre"],
    ["address", "Dirección"],
    ["rows", "Horarios"],
  ]);

  it("names each invalid field by its label, in the form's order", () => {
    expect(
      summaryLabels(
        [
          { path: "address", message: "Escribe la dirección." },
          { path: "name", message: "Escribe el nombre." },
        ],
        labels,
      ),
    ).toEqual(["Nombre", "Dirección"]);
  });

  it("names a nested field by its nearest labelled ancestor, once", () => {
    expect(
      summaryLabels(
        [
          { path: "rows.0.start", message: "Elige la hora." },
          { path: "rows.1.start", message: "Elige la hora." },
        ],
        labels,
      ),
    ).toEqual(["Horarios"]);
  });

  it("asks for an unlabelled field's own name before falling back", () => {
    expect(
      summaryLabels(
        [
          { path: "weekly.1.time", message: "Se cruza con el lunes." },
          { path: "name", message: "Escribe el nombre." },
        ],
        labels,
        (path) => (path === "weekly.1.time" ? "Hora, fila 2" : undefined),
      ),
    ).toEqual(["Nombre", "Hora, fila 2"]);
  });

  it("falls back to the message for a field without a label, after the rest", () => {
    expect(
      summaryLabels(
        [
          { path: "secret", message: "Falta un dato." },
          { path: "name", message: "Escribe el nombre." },
        ],
        labels,
      ),
    ).toEqual(["Nombre", "Falta un dato."]);
  });
});

describe("missingDataTitle", () => {
  it("counts the missing data in Spanish", () => {
    expect(missingDataTitle(1)).toBe("Falta 1 dato para guardar");
    expect(missingDataTitle(3)).toBe("Faltan 3 datos para guardar");
  });
});
