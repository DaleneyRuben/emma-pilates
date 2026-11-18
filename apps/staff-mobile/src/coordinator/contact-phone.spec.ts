import { describeContact } from "../assistant/assistant-format";
import { whatsAppHref } from "./contact-list-copy";

// FIX-037: numbers read with their flag, and WhatsApp opens the number's own
// country, not always Bolivia.
describe("phones with a country code in the Staff app", () => {
  it("opens WhatsApp with the stored country code", () => {
    expect(whatsAppHref("+591 70000002")).toBe("https://wa.me/59170000002");
    expect(whatsAppHref("+51 912345678")).toBe("https://wa.me/51912345678");
    expect(whatsAppHref("+54 91123456789")).toBe("https://wa.me/5491123456789");
    expect(whatsAppHref("700 00002")).toBe("https://wa.me/59170000002");
  });

  it("shows the number with its flag beside the email", () => {
    expect(describeContact("+51 912345678", "vale@example.com")).toBe(
      "🇵🇪 +51 912345678 · vale@example.com",
    );
    expect(describeContact(null, "ana@example.com")).toBe("ana@example.com");
  });

  // Walkthrough finding 109: the search results and other staff lists say a
  // stored phone is unusable, as the client file header does (finding 95).
  it("says the phone is incomplete instead of showing unusable digits", () => {
    expect(describeContact("7000004", "sofia@example.com")).toBe(
      "Celular incompleto · sofia@example.com",
    );
    expect(describeContact("  ", "sofia@example.com")).toBe("sofia@example.com");
  });
});
