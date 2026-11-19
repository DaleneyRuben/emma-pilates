import { endedNotice, replacedNotice } from "./schedule-notices";

describe("schedule change notices", () => {
  it("leaves out the kept Sessions when every affected one had no Bookings", () => {
    expect(
      replacedNotice(
        { created: 4, skipped: 0, cancelledSessions: 4, keptSessions: 0 },
        "2026-10-02",
      ),
    ).toBe(
      "Serie actualizada desde el vie 2 oct: 4 clases nuevas; 4 sin reservas se reemplazaron.",
    );
    expect(
      endedNotice({ cancelledSessions: 1, keptSessions: 0 }, "2026-10-03"),
    ).toBe(
      "La serie deja de repetirse desde el sáb 3 oct: 1 clase sin reservas se canceló.",
    );
  });

  it("says so when nothing had to change", () => {
    expect(
      endedNotice({ cancelledSessions: 0, keptSessions: 0 }, "2026-10-03"),
    ).toBe(
      "La serie deja de repetirse desde el sáb 3 oct. No había clases futuras que cambiar.",
    );
  });
});
