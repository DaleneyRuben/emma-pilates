import { boliviaInstant, formatLongDay } from "../lib/bolivia-time";
import { cancellationNote } from "./session-cancellation";

const at = boliviaInstant("2026-11-05", "15:30");

describe("FIX-042 the read-only panel's sentence", () => {
  it("only mentions the returned classes when the class had bookings", () => {
    const day = formatLongDay("2026-11-05");
    expect(
      cancellationNote({
        cause: "minimum_not_met",
        cancelledAt: at,
        bookedCount: 0,
      }),
    ).toBe(
      `Se canceló sola el ${day} a las 15:30: no llegó al mínimo de reservas.`,
    );
    expect(
      cancellationNote({ cause: "studio", cancelledAt: at, bookedCount: 0 }),
    ).toBe(`La canceló el estudio el ${day} a las 15:30.`);
  });
});
