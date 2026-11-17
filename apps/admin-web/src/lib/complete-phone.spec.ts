import { isCompletePhone } from "./complete-phone";

// Walkthrough finding 74 (FIX-063): a stored phone saved before the rule.
describe("isCompletePhone", () => {
  it.each([
    "+591 70011001",
    "+591 61234567",
    "+51 912345678",
    "+44 7911123456",
    // Saved before FIX-037: dashes or spaces, or a Bolivian mobile without +591.
    "+591 7001-1001",
    "+54 9 11 1234 5678",
    "70011001",
  ])("accepts %s, a mobile stored with its country code", (stored) => {
    expect(isCompletePhone(stored)).toBe(true);
  });

  it.each<[string | null, string]>([
    [null, "none"],
    ["", "an empty one"],
    ["7000004", "digits without a country code"],
    ["+591 7000004", "seven Bolivian digits"],
    ["+591 50011001", "a Bolivian number starting with 5"],
    ["+51 12345", "a short Peruvian number"],
    ["+591 59170011001", "the country code typed twice"],
    ["+44 1", "one digit after a code outside the list"],
  ])("refuses %s (%s)", (stored) => {
    expect(isCompletePhone(stored)).toBe(false);
  });
});
