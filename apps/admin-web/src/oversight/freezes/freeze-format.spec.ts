import type { FreezeReviewDto } from "@pilates/api-contracts";
import {
  freezeDayCount,
  freezeDecidedBy,
  freezeDecidedPlanEnd,
  freezePendingPlanEnd,
} from "./freeze-format";

const base: FreezeReviewDto = {
  id: "freeze-1",
  clientName: "Valeria Quiroga",
  clientPhoto: null,
  planName: "Paquete de 12 clases",
  startsOn: "2026-11-10",
  endsOn: "2026-11-16",
  reason: "Viaje",
  state: "requested",
  planEndsOn: "2027-02-05",
  planEndsOnAfter: "2027-02-12",
};

describe("freeze format (walkthrough findings 52/53)", () => {
  it("counts both frozen days", () => {
    expect(freezeDayCount("2026-11-10", "2026-11-16")).toBe("7 días");
    expect(freezeDayCount("2026-11-30", "2026-12-02")).toBe("3 días");
    expect(freezeDayCount("2026-11-10", "2026-11-10")).toBe("1 día");
  });

  it("shows what approving a pending request does to the plan end", () => {
    expect(freezePendingPlanEnd(base)).toBe("5 feb → 12 feb");
    expect(freezePendingPlanEnd({ ...base, planEndsOnAfter: null })).toBe(
      "5 feb",
    );
    expect(
      freezePendingPlanEnd({
        ...base,
        planEndsOn: undefined,
        planEndsOnAfter: undefined,
      }),
    ).toBeUndefined();
  });

  it("shows the new end of an approved freeze and the unchanged end of a refused one", () => {
    expect(freezeDecidedPlanEnd({ ...base, state: "approved" })).toBe(
      "12 feb (antes 5 feb)",
    );
    expect(
      freezeDecidedPlanEnd({
        ...base,
        state: "refused",
        planEndsOnAfter: null,
      }),
    ).toBe("5 feb");
    expect(
      freezeDecidedPlanEnd({
        ...base,
        state: "approved",
        planEndsOnAfter: undefined,
      }),
    ).toBe("5 feb");
    expect(
      freezeDecidedPlanEnd({ ...base, planEndsOn: undefined }),
    ).toBeUndefined();
  });

  it("names who decided and when, in La Paz time", () => {
    const decided = {
      ...base,
      state: "approved" as const,
      decidedAt: "2026-11-08T14:15:00.000Z",
      decidedByName: "Paola Mendoza",
    };
    expect(freezeDecidedBy(decided)).toBe(
      "Decidido por Paola Mendoza · 8 nov 10:15",
    );
    expect(freezeDecidedBy({ ...decided, decidedByName: null })).toBe(
      "Decidido · 8 nov 10:15",
    );
    expect(freezeDecidedBy({ ...decided, decidedAt: null })).toBe(
      "Decidido por Paola Mendoza",
    );
    expect(
      freezeDecidedBy({ ...decided, decidedAt: null, decidedByName: null }),
    ).toBeUndefined();
  });
});

// Owner 2026-11-08: a withdrawal is the Client's, never a refusal.
describe("a withdrawn freeze", () => {
  it("reads «Retirado por la clienta» with the unchanged end", () => {
    const withdrawn: FreezeReviewDto = {
      ...base,
      state: "withdrawn",
      planEndsOnAfter: null,
      decidedAt: "2026-11-08T14:15:00.000Z",
      decidedByName: "Valeria Quiroga",
    };
    expect(freezeDecidedBy(withdrawn)).toBe(
      "Retirado por la clienta · 8 nov 10:15",
    );
    expect(freezeDecidedPlanEnd(withdrawn)).toBe("5 feb");
  });
});
