import { bolivianMobileSchema } from "./bolivian-mobile";

// MOB-070: a saved phone is a Bolivian mobile, the number WhatsApp can reach.
// A blank field still clears it.
describe("Bolivian mobile numbers", () => {
  const phone = bolivianMobileSchema;

  it("accepts a Bolivian mobile and normalizes it to +591", () => {
    expect(phone.parse("+591 71234567")).toBe("+59171234567");
    expect(phone.parse("71234567")).toBe("+59171234567");
    expect(phone.parse("+59171234567")).toBe("+59171234567");
  });

  it("accepts a blank phone so the field can be cleared", () => {
    expect(phone.parse("")).toBe("");
    expect(phone.parse("   ")).toBe("");
  });

  it("rejects a landline, another country, and a short number", () => {
    expect(phone.safeParse("+591 41234567").success).toBe(false);
    expect(phone.safeParse("+54 9 11 1234 5678").success).toBe(false);
    expect(phone.safeParse("7123456").success).toBe(false);
    expect(phone.safeParse("+591 712345678").success).toBe(false);
  });
});
