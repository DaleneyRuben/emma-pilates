import { freezeRequestFailure } from "./freeze-refusal-copy";

describe("freeze request failure", () => {
  it("names a final refusal and keeps the retry message for anything else", () => {
    expect(freezeRequestFailure({ code: "freeze_not_allowed" })).toBe(
      "Este plan no se puede congelar.",
    );
    expect(freezeRequestFailure({ code: "freeze_start_in_past" })).toBe(
      "Elige una fecha de hoy en adelante.",
    );
    expect(freezeRequestFailure({ code: "freeze_outside_term" })).toBe(
      "Esas fechas quedan fuera de tu plan.",
    );
    expect(freezeRequestFailure({ code: "invalid_civil_date" })).toBe(
      "Esas fechas no son válidas.",
    );
    expect(freezeRequestFailure({ code: "something_else" })).toBe(
      "No pudimos enviar la solicitud. Inténtalo de nuevo.",
    );
  });
});
