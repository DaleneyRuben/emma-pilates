import type { FreezeReviewDto } from "@pilates/api-contracts";

import {
  freezeDays,
  freezeDecidedDetail,
  freezeDecision,
  freezePlanEndRow,
  freezeRequestLine,
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

  // FIX-090: the shared list dates, the month once when it stays the same.
  it("names the month once when the freeze stays in it", () => {
    expect(freezeRange("2026-11-09", "2026-11-15")).toBe("lun 9 al dom 15 nov");
    expect(freezeRange("2026-11-30", "2026-12-04")).toBe("lun 30 nov al vie 4 dic");
  });

  // E9 A: the plan end as a table row, the earlier end in brackets.
  it("shows where the plan end would move while requested", () => {
    expect(freezePlanEndRow(base)).toEqual({
      label: "Vencería",
      value: "vie 12 feb (antes vie 5 feb)",
    });
  });

  it("shows the new plan end once approved", () => {
    expect(freezePlanEndRow(approved)).toEqual({
      label: "Vence",
      value: "vie 12 feb (antes vie 5 feb)",
    });
  });

  it("keeps the plan end of a refused freeze", () => {
    expect(freezePlanEndRow(refused)).toEqual({ label: "Vence", value: "vie 5 feb" });
  });

  it("draws no plan end when an older API leaves it out", () => {
    const { planEndsOn: _before, planEndsOnAfter: _after, ...older } = base;
    expect(freezePlanEndRow(older)).toBeUndefined();
    expect(freezePlanEndRow({ ...base, planEndsOnAfter: undefined })).toEqual({
      label: "Vence",
      value: "vie 5 feb",
    });
  });

  it("says what she asks for, with the days counted", () => {
    expect(freezeRequestLine(base)).toBe("Pide congelar del lun 9 al dom 15 nov (7 días)");
    expect(freezeRequestLine(approved)).toBe("Pidió congelar del lun 9 al dom 15 nov (7 días)");
  });

  it("names who decided and when, in La Paz time", () => {
    expect(freezeDecision(approved)).toBe("Aprobada por Paola Mendoza el dom 8 nov a las 10:15");
    expect(freezeDecision(refused)).toBe("Rechazada por Paola Mendoza el dom 8 nov a las 10:15");
  });

  it("falls back when the decision details are missing", () => {
    expect(freezeDecision({ ...approved, decidedByName: null })).toBe(
      "Aprobada el dom 8 nov a las 10:15",
    );
    expect(freezeDecision({ ...refused, decidedAt: undefined, decidedByName: undefined })).toBe(
      "Rechazada",
    );
    expect(freezeDecision(base)).toBeUndefined();
  });

  it("sums up a decided freeze for its list row", () => {
    expect(freezeDecidedDetail(approved)).toBe("Aprobada · ahora vence el vie 12 feb");
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
    expect(freezeDecision(withdrawn)).toBe("Retirada por la clienta el dom 8 nov a las 10:15");
    expect(freezeDecidedDetail(withdrawn)).toBe("Retirada");
    expect(freezePlanEndRow(withdrawn)).toEqual({ label: "Vence", value: "vie 5 feb" });
  });
});
