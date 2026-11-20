import { refusalDisabledReason, refusalReasonText } from "./freeze-refusal";

describe("freeze refusal reason", () => {
  it("joins the chip and her message, or sends the chip alone", () => {
    expect(refusalReasonText("Ya usó su congelamiento", "  ")).toBe("Ya usó su congelamiento");
    expect(refusalReasonText("Faltan días de aviso", " Avisa antes. ")).toBe(
      "Faltan días de aviso. Avisa antes.",
    );
  });

  it("needs a chip, and a message with «Otro motivo»", () => {
    expect(refusalReasonText(null, "Algo")).toBeUndefined();
    expect(refusalReasonText("Otro motivo", " ")).toBeUndefined();
    expect(refusalDisabledReason(null, "", "Lucía")).toBe("Elige un motivo.");
    expect(refusalDisabledReason("Otro motivo", "", "Lucía")).toBe("Escribe el motivo para Lucía.");
    expect(refusalDisabledReason("Otro motivo", "Ya terminó", "Lucía")).toBeUndefined();
  });

  it("never runs past the 300 characters the API takes", () => {
    const long = "a".repeat(300);
    expect(refusalReasonText("Otro motivo", long)).toHaveLength(300);
    expect(refusalReasonText("Faltan días de aviso", long)).toHaveLength(300);
  });
});
