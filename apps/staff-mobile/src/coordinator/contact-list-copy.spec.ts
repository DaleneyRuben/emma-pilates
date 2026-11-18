import type { ContactAlertItemDto } from "@pilates/api-contracts";

import {
  contactMissingPhoneNote,
  contactReasonLine,
  contactRowMeta,
  sortContactAlerts,
} from "./contact-list-copy";

const item = (over: Partial<ContactAlertItemDto>): ContactAlertItemDto => ({
  clientId: "client-x",
  name: "Clienta",
  phone: "+591 70000005",
  photo: null,
  startedOn: "2026-11-06",
  reasons: ["no_booking_7_days"],
  ...over,
});

// Walkthrough finding 113: S28's reasons are one plain line, not chips.
describe("contactReasonLine", () => {
  it("joins her reasons in a fixed order, only the first capitalised", () => {
    expect(contactReasonLine(["fewer_than_2_classes_by_day_15", "no_booking_7_days"])).toBe(
      "7 días sin reservar · menos de 2 clases a los 15 días",
    );
    expect(contactReasonLine(["fewer_than_4_classes_in_first_30_days"])).toBe(
      "Menos de 4 clases en su primer mes",
    );
  });
});

describe("contactRowMeta", () => {
  it("gives only her start when WhatsApp works", () => {
    expect(contactRowMeta(item({}))).toBe("Empezó el 6 de noviembre");
  });

  it("leads with what is wrong with her phone", () => {
    expect(contactRowMeta(item({ phone: "7000004", startedOn: "2026-11-02" }))).toBe(
      "Celular incompleto · empezó el 2 de noviembre",
    );
    expect(contactRowMeta(item({ phone: null, startedOn: "2026-11-05" }))).toBe(
      "Sin teléfono · empezó el 5 de noviembre",
    );
  });
});

describe("contactMissingPhoneNote", () => {
  it("says why WhatsApp cannot open", () => {
    expect(contactMissingPhoneNote("7000004")).toBe(
      "Su celular está incompleto (7000004), así que no se puede abrir WhatsApp. Háblale en el estudio o revisa su ficha.",
    );
    expect(contactMissingPhoneNote(null)).toBe(
      "No tiene teléfono registrado, así que no se puede abrir WhatsApp. Háblale en el estudio o revisa su ficha.",
    );
  });
});

describe("sortContactAlerts", () => {
  it("puts more reasons first, then the earliest start, then the name", () => {
    const rocio = item({ clientId: "rv", name: "Rocío Vargas", startedOn: "2026-11-06" });
    const camila = item({ clientId: "cr", name: "Camila Rojas", startedOn: "2026-11-06" });
    const mariana = item({ clientId: "mq", name: "Mariana Quiroga", startedOn: "2026-11-05" });
    const lucia = item({
      clientId: "lf",
      name: "Lucía Fernández",
      startedOn: "2026-11-02",
      reasons: ["no_booking_7_days", "fewer_than_2_classes_by_day_15"],
    });

    expect(sortContactAlerts([rocio, camila, mariana, lucia]).map((c) => c.clientId)).toEqual([
      "lf",
      "mq",
      "cr",
      "rv",
    ]);
  });
});
