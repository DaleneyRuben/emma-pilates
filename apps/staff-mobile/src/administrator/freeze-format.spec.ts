import type { FreezeReviewDto } from "@pilates/api-contracts";

import {
  freezeDays,
  freezeDecidedDetail,
  freezeDecision,
  freezePlanEnd,
  freezeRange,
} from "./freeze-format";

const base: FreezeReviewDto = {
  id: "freeze-1",
  clientName: "Lucía Fernández",
  clientPhoto: null,
  planName: "Trimestral 36 clases",
  startsOn: "2026-11-09",
  endsOn: "2026-11-15",
  reason: "Viaje",
  state: "requested",
  planEndsOn: "2027-02-05",
  planEndsOnAfter: "2027-02-12",
  decidedAt: null,
  decidedByName: null,
};

const approved: FreezeReviewDto = {
  ...base,
  state: "approved",
  decidedAt: "2026-11-08T14:15:00.000Z",
  decidedByName: "Paola Mendoza",
};

const refused: FreezeReviewDto = {
  ...approved,
  state: "refused",
  planEndsOnAfter: null,
};

describe("freeze format", () => {
  it("counts both frozen days", () => {
    expect(freezeDays("2026-11-09", "2026-11-15")).toBe("7 días");
    expect(freezeDays("2026-11-09", "2026-11-09")).toBe("1 día");
  });

  it("names the month once when the freeze stays in it", () => {
    expect(freezeRange("2026-11-09", "2026-11-15")).toBe("9 al 15 de noviembre");
    expect(freezeRange("2026-11-30", "2026-12-04")).toBe("30 de noviembre al 4 de diciembre");
  });

  it("shortens the months for a list row", () => {
    expect(freezeRange("2026-11-09", "2026-11-15", "short")).toBe("9 al 15 nov");
    expect(freezeRange("2026-11-30", "2026-12-04", "short")).toBe("30 nov al 4 dic");
  });

  it("shows where the plan end moves while requested", () => {
    expect(freezePlanEnd(base)).toBe("Vence el 5 de febrero → 12 de febrero");
  });

  it("shows the new plan end once approved", () => {
    expect(freezePlanEnd(approved)).toBe("Ahora vence el 12 de febrero (antes, el 5 de febrero)");
  });

  it("keeps the plan end of a refused freeze", () => {
    expect(freezePlanEnd(refused)).toBe("Vence el 5 de febrero");
  });

  it("draws no plan end when an older API leaves it out", () => {
    const { planEndsOn: _before, planEndsOnAfter: _after, ...older } = base;
    expect(freezePlanEnd(older)).toBeUndefined();
    expect(freezePlanEnd({ ...base, planEndsOnAfter: undefined })).toBe("Vence el 5 de febrero");
  });

  it("names who decided and when, in La Paz time", () => {
    expect(freezeDecision(approved)).toBe(
      "Aprobada por Paola Mendoza el 8 de noviembre a las 10:15",
    );
    expect(freezeDecision(refused)).toBe(
      "Rechazada por Paola Mendoza el 8 de noviembre a las 10:15",
    );
  });

  it("falls back when the decision details are missing", () => {
    expect(freezeDecision({ ...approved, decidedByName: null })).toBe(
      "Aprobada el 8 de noviembre a las 10:15",
    );
    expect(freezeDecision({ ...refused, decidedAt: undefined, decidedByName: undefined })).toBe(
      "Rechazada",
    );
    expect(freezeDecision(base)).toBeUndefined();
  });

  it("sums up a decided freeze for its list row", () => {
    expect(freezeDecidedDetail(approved)).toBe("Aprobada · ahora vence el 12 feb");
    expect(freezeDecidedDetail({ ...approved, planEndsOnAfter: undefined })).toBe("Aprobada");
    expect(freezeDecidedDetail(refused)).toBe("Rechazada");
  });
});

// Owner 2026-11-08: a request the Client withdrew stays in the history as
// «Retirada», by her, never as a refusal.
describe("a withdrawn freeze", () => {
  const withdrawn: FreezeReviewDto = {
    ...base,
    state: "withdrawn",
    planEndsOnAfter: null,
    decidedAt: "2026-11-08T14:15:00.000Z",
    decidedByName: "Lucía Fernández",
  };

  it("reads «Retirada por la clienta», with its day and time", () => {
    expect(freezeDecision(withdrawn)).toBe("Retirada por la clienta el 8 de noviembre a las 10:15");
    expect(freezeDecidedDetail(withdrawn)).toBe("Retirada");
    expect(freezePlanEnd(withdrawn)).toBe("Vence el 5 de febrero");
  });
});
