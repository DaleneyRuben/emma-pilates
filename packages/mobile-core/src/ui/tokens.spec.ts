import { colors } from "./tokens";

// Follow-up 70: the quiet text tones meet AA (4.5:1) on Blanco and Superficie
// sutil, and text on Palo de rosa tinte has its own deeper tone.
describe("colour tokens (follow-up 70)", () => {
  it("darkens the two quiet text tones", () => {
    expect(colors.textMuted).toBe("#766D69");
    expect(colors.textSubtle).toBe("#7A716D");
  });

  it("names the text tone for Palo de rosa tinte", () => {
    expect(colors.primaryTint).toBe("#EFE0DC");
    expect(colors.primaryOnTint).toBe("#7A4F4B");
  });
});
