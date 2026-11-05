import { bolivianMobileSchema, normalizeBolivianMobile } from "./bolivian-mobile";

// MOB-070 with decision §19.20 (owner, 2026-11-04): a saved phone is a
// Bolivian mobile, 8 digits starting with 6 or 7. The +591 is implicit: the
// field takes the 8 digits alone or with +591, and the phone is sent as
// «+591 XXXXXXXX». A blank field still clears it.
describe("Bolivian mobile numbers", () => {
  const phone = bolivianMobileSchema;

  it("accepts the 8 digits alone or with +591 and sends them with +591", () => {
    expect(phone.parse("71234567")).toBe("+591 71234567");
    expect(phone.parse("60012345")).toBe("+591 60012345");
    expect(phone.parse(" 7123 4567 ")).toBe("+591 71234567");
    expect(phone.parse("712-34-567")).toBe("+591 71234567");
    expect(phone.parse("+591 71234567")).toBe("+591 71234567");
    expect(phone.parse("+59171234567")).toBe("+591 71234567");
    expect(phone.parse("  +591 70011004  ")).toBe("+591 70011004");
  });

  it("accepts a blank phone so the field can be cleared", () => {
    expect(phone.parse("")).toBe("");
    expect(phone.parse("   ")).toBe("");
  });

  it("rejects a landline, another country, another first digit, and a short or long one", () => {
    expect(phone.safeParse("+591 41234567").success).toBe(false);
    expect(phone.safeParse("+54 9 11 1234 5678").success).toBe(false);
    expect(phone.safeParse("81234567").success).toBe(false);
    expect(phone.safeParse("7123456").success).toBe(false);
    expect(phone.safeParse("+591 712345678").success).toBe(false);
  });

  it("writes a Bolivian mobile with +591 and leaves anything else as typed", () => {
    expect(normalizeBolivianMobile("7000 0004")).toBe("+591 70000004");
    expect(normalizeBolivianMobile(" ")).toBe("");
    expect(normalizeBolivianMobile("+54 9 11 1234 5678")).toBe("+54 9 11 1234 5678");
  });
});
