import { isCompletePhone } from "./complete-phone";

// Walkthrough finding 74 (FIX-063): a stored phone saved before the rule.
describe("isCompletePhone", () => {
  it.each([
    "+591 70011001",
    "+591 61234567",
    "+51 912345678",
    "+44 7911123456",
  ])("accepts %s, a mobile stored with its country code", (stored) => {
    expect(isCompletePhone(stored)).toBe(true);
  });

  it.each<[string | null, string]>([
    [null, "none"],
    ["", "an empty one"],
    ["7000004", "digits without a country code"],
    ["70011001", "a Bolivian mobile without +591"],
    ["+591 7000004", "seven Bolivian digits"],
    ["+591 50011001", "a Bolivian number starting with 5"],
    ["+51 12345", "a short Peruvian number"],
  ])("refuses %s (%s)", (stored) => {
    expect(isCompletePhone(stored)).toBe(false);
  });
});
