import {
  capacityLabel,
  formatDateTime,
  formatListDate,
  formatMoney,
  formatTitleDate,
  staffRoleLabel,
} from "@pilates/api-contracts";

// FIX-090 (owner 2026-11-19, `DECISIONES-AUDITORIA-2026-11-19.md`): one
// format for money, dates and places on every surface.
describe("shared display formats", () => {
  it("writes money with two decimals, or none when they are ,00", () => {
    expect(formatMoney(153490)).toBe("Bs 1.534,90");
    expect(formatMoney(45000)).toBe("Bs 450");
    expect(formatMoney(120000000)).toBe("Bs 1.200.000");
    expect(formatMoney(5)).toBe("Bs 0,05");
    expect(formatMoney(-70000)).toBe("−Bs 700");
  });

  it("writes a list date as «jue 19 nov»", () => {
    expect(formatListDate("2026-11-19")).toBe("jue 19 nov");
    expect(formatListDate(new Date("2026-11-20T02:00:00.000Z"))).toBe(
      "jue 19 nov",
    );
  });

  it("writes a title date as «Jueves 19 de noviembre»", () => {
    expect(formatTitleDate("2026-11-19")).toBe("Jueves 19 de noviembre");
    expect(formatTitleDate("2027-01-03")).toBe("Domingo 3 de enero");
  });

  it("writes a date with its time as «jue 19 nov · 08:00» in La Paz", () => {
    expect(formatDateTime("2026-11-19T12:00:00.000Z")).toBe(
      "jue 19 nov · 08:00",
    );
  });

  it("writes places as «N de M lugares»", () => {
    expect(capacityLabel(4, 8)).toBe("4 de 8 lugares");
    expect(capacityLabel(1, 1)).toBe("1 de 1 lugar");
  });

  it("names the trainer Role «Instructora»", () => {
    expect(staffRoleLabel("trainer")).toBe("Instructora");
    expect(staffRoleLabel("trainer", "male")).toBe("Instructor");
  });
});
