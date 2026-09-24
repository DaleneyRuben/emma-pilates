import { endedNotice, replacedNotice } from "./schedule-notices";

describe("schedule change notices", () => {
  it("leaves out the kept Sessions when every affected one had no Bookings", () => {
    expect(
      replacedNotice(
        { created: 4, skipped: 0, cancelledSessions: 4, keptSessions: 0 },
        "2026-10-02",
      ),
    ).toBe(
      "Serie actualizada desde el 02/10/2026: 4 sesiones nuevas; 4 sin reservas se reemplazaron.",
    );
    expect(
      endedNotice({ cancelledSessions: 1, keptSessions: 0 }, "2026-10-03"),
    ).toBe(
      "La serie deja de repetirse desde el 03/10/2026: 1 sesión sin reservas se canceló.",
    );
  });

  it("says so when nothing had to change", () => {
    expect(
      endedNotice({ cancelledSessions: 0, keptSessions: 0 }, "2026-10-03"),
    ).toBe(
      "La serie deja de repetirse desde el 03/10/2026. No había sesiones futuras que cambiar.",
    );
  });
});
