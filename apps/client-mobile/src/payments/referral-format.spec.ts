import { formatReferralDate } from "./referral-format";

describe("formatReferralDate", () => {
  it("prints the Bolivia civil day and month in Spanish", () => {
    expect(formatReferralDate("2026-09-18T15:00:00.000Z")).toBe("18 de septiembre");
  });

  it("uses the Bolivia day when the instant is past midnight UTC", () => {
    expect(formatReferralDate("2026-09-19T02:30:00.000Z")).toBe("18 de septiembre");
  });
});
