import { isCompletePhone } from "./complete-phone";
import {
  bolivia,
  phoneProblem,
  phoneRequiredMessage,
  storedPhone,
} from "./phone-number";

// The rules live in `@pilates/phone-number`; the web only asks in the third
// person (verification n.º 41).
describe("the admin web's phone rules", () => {
  it("asks for someone else's number", () => {
    expect(phoneProblem(bolivia, "  ")).toBe(phoneRequiredMessage);
    expect(phoneRequiredMessage).toBe(
      "Escribe su celular. Lo necesitamos para escribirle por WhatsApp.",
    );
  });

  it("checks the number with libphonenumber", () => {
    expect(phoneProblem(bolivia, "5700 7684")).toBeNull();
    expect(storedPhone(bolivia, "5700 7684")).toBe("+591 57007684");
    expect(phoneProblem(bolivia, "22123456")).toBe(
      "Ese número no parece un celular de Bolivia.",
    );
    expect(isCompletePhone("+591 57007684")).toBe(true);
    expect(isCompletePhone(null)).toBe(false);
  });
});
