import type { PayStatementLineDto } from "@pilates/api-contracts";

import { groupSummary, payGroups } from "./pay-groups";
import { linesByDay } from "./pay-line-days";

const line = (kind: string, detail: string, amountCentavos: number) =>
  ({ kind, detail, amountCentavos }) as PayStatementLineDto;

// E2 B: the statement summed by concept, each with a quiet line.
describe("payGroups", () => {
  it("sums each concept in order with its count", () => {
    const groups = payGroups([
      line("commission", "Ana Rojas · Plan 30 días · 10 % de Bs 450", 4_500),
      line("minimum_not_met", "lun 2 nov · 08:00 · Achumani · Mat Pilates", 2_500),
      line("class", "mar 3 nov · 10:00 · Norte · Reformer · 4 clientas", 6_500),
      line("minimum_not_met", "lun 2 nov · 10:00 · Achumani · Reformer", 2_500),
      line("commission", "Sara Paz · Plan 60 días · 10 % de Bs 749", 7_490),
    ]);

    expect(groups.map(({ label, note, centavos }) => ({ label, note, centavos }))).toEqual([
      { label: "Clases dictadas", note: "1 × Bs 65", centavos: 6_500 },
      { label: "Canceladas por mínimo", note: "2 × Bs 25", centavos: 5_000 },
      { label: "Comisiones de primer plan", note: "2 clientas nuevas", centavos: 11_990 },
    ]);
  });

  it("counts classes that pay different amounts, and keeps an unknown kind", () => {
    const groups = payGroups([
      line("class", "4 clientas", 6_500),
      line("class", "6 clientas, 2 extra", 8_100),
      line("holiday_bonus", "Feriado", 10_000),
    ]);

    expect(groups.map(({ key, note }) => ({ key, note }))).toEqual([
      { key: "class", note: "2 clases" },
      { key: "other", note: "Feriado" },
    ]);
  });

  it("names the Coordinator's base and bonus without repeating the label", () => {
    const groups = payGroups([
      line("base", "Base", 350_000),
      line("bonus", "Bono de renovación", 40_000),
    ]);

    expect(groups.map(({ label, note }) => ({ label, note }))).toEqual([
      { label: "Base", note: null },
      { label: "Bono", note: "Bono de renovación" },
    ]);
  });
});

describe("groupSummary", () => {
  it("multiplies equal classes out and says why a cancelled class pays", () => {
    const [group] = payGroups([
      line("minimum_not_met", "lun 2 nov · 08:00 · Achumani · Mat Pilates", 2_500),
      line("minimum_not_met", "lun 2 nov · 10:00 · Achumani · Reformer", 2_500),
    ]);

    expect(group && groupSummary(group)).toBe(
      "2 clases × Bs 25 = Bs 50. Se te pagan aunque no se llegue al mínimo.",
    );
  });

  it("adds up classes that pay different amounts", () => {
    const [group] = payGroups([line("class", "a", 6_500), line("class", "b", 8_100)]);

    expect(group && groupSummary(group)).toBe("2 clases · Bs 146 en total.");
  });
});

// E2 C: a group's detail by day.
describe("linesByDay", () => {
  it("groups class lines by their day with each day's count and sum", () => {
    const { days, undated } = linesByDay([
      line("minimum_not_met", "lun 2 nov · 08:00 · Achumani · Mat Pilates", 2_500),
      line("minimum_not_met", "lun 2 nov · 18:00 · Norte · Reformer", 2_500),
      line("class", "mié 4 nov · 07:00 · Norte · Reformer · 6 clientas, 2 extra", 8_100),
    ]);

    expect(undated).toEqual([]);
    expect(days).toEqual([
      {
        title: "lunes 2 nov",
        centavos: 5_000,
        lines: [
          {
            time: "08:00",
            classType: "Mat Pilates",
            branch: "Achumani",
            extra: null,
            amountCentavos: 2_500,
          },
          {
            time: "18:00",
            classType: "Reformer",
            branch: "Norte",
            extra: null,
            amountCentavos: 2_500,
          },
        ],
      },
      {
        title: "miércoles 4 nov",
        centavos: 8_100,
        lines: [
          {
            time: "07:00",
            classType: "Reformer",
            branch: "Norte",
            extra: "6 clientas, 2 extra",
            amountCentavos: 8_100,
          },
        ],
      },
    ]);
  });

  it("keeps a line that names no class undated, split at its first dot", () => {
    const { days, undated } = linesByDay([
      line("commission", "Ana Rojas · Plan 30 días · 10 % de Bs 450", 4_500),
      line("class", "3 clientas", 6_500),
    ]);

    expect(days).toEqual([]);
    expect(undated).toEqual([
      { title: "Ana Rojas", note: "Plan 30 días · 10 % de Bs 450", amountCentavos: 4_500 },
      { title: "3 clientas", note: null, amountCentavos: 6_500 },
    ]);
  });
});
