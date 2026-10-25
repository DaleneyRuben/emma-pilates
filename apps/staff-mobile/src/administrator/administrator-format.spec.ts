import { describeSessionCancellation } from "./administrator-format";

describe("describeSessionCancellation (S14)", () => {
  it("uses S14's sentence with the live counts", () => {
    expect(describeSessionCancellation({ bookedCount: 6, waitlistCount: 2 })).toBe(
      "Se cancelarán las 6 reservas de esta clase, se reembolsará una clase a cada clienta afectada, incluso si ya no podían cancelar por su cuenta, y se les notificará. También se notificará a las 2 en lista de espera.",
    );
    expect(describeSessionCancellation({ bookedCount: 6, waitlistCount: 2 })).not.toMatch(/[—–]/);
  });

  it("drops the Waitlist sentence when nobody waits", () => {
    expect(describeSessionCancellation({ bookedCount: 10, waitlistCount: 0 })).toBe(
      "Se cancelarán las 10 reservas de esta clase, se reembolsará una clase a cada clienta afectada, incluso si ya no podían cancelar por su cuenta, y se les notificará.",
    );
  });

  it("speaks of one Booking and one waiting person in the singular", () => {
    expect(describeSessionCancellation({ bookedCount: 1, waitlistCount: 1 })).toBe(
      "Se cancelará la única reserva de esta clase, se reembolsará la clase a la clienta afectada, incluso si ya no podía cancelar por su cuenta, y se le notificará. También se notificará a la persona en lista de espera.",
    );
  });

  it("says a class without Bookings is only cancelled", () => {
    expect(describeSessionCancellation({ bookedCount: 0, waitlistCount: 0 })).toBe(
      "Se cancelará esta clase. No tiene reservas.",
    );
  });
});
