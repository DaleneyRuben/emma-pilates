import type { PayStatementDto } from "@pilates/api-contracts";
import { recalculationSummary } from "./recalculation-summary";

const statement = (
  id: string,
  totalCentavos: number,
  staffMemberId = "emma",
): PayStatementDto =>
  ({
    id,
    staffMemberId,
    staffMemberName: staffMemberId === "emma" ? "Emma Vargas" : "Daniela Ortiz",
    totalCentavos,
  }) as PayStatementDto;

const at = new Date("2026-11-18T18:32:00.000Z");

// Review of finding 105: a person can hold several statements in the window
// (two week drafts a month draft then replaces), so totals add up per person.
describe("recalculation summary", () => {
  it("compares what each person is owed in the whole window", () => {
    expect(
      recalculationSummary(
        "Noviembre de 2026",
        [statement("week-1", 13_000), statement("week-2", 6_500)],
        [statement("month", 19_500)],
        at,
      ),
    ).toBe("Recalculamos noviembre de 2026 a las 14:32. Ningún sueldo cambió.");
  });

  it("names who changed, who is new and who no longer has pay", () => {
    expect(
      recalculationSummary(
        "Noviembre de 2026",
        [statement("a", 6_500)],
        [statement("b", 9_000), statement("c", 2_500, "daniela")],
        at,
      ),
    ).toBe(
      "Recalculamos noviembre de 2026 a las 14:32. Cambió 2 sueldos: Emma Vargas pasó de Bs 65 a Bs 90; Daniela Ortiz, nuevo: Bs 25.",
    );
  });
});
