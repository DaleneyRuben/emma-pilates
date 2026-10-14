import { parsePushPayload } from "./push-payload";

const valid = {
  notificationId: "11111111-1111-4111-8111-111111111111",
  type: "waitlist_promoted",
  destinationType: "booking",
  destinationId: "22222222-2222-4222-8222-222222222222",
};

describe("parsePushPayload (ADR-0036)", () => {
  it("accepts the identifiers the backend sends", () => {
    expect(parsePushPayload(valid)).toEqual(valid);
  });

  it("accepts a destination without an identifier, or none at all", () => {
    expect(parsePushPayload({ ...valid, destinationId: null })).toEqual({
      ...valid,
      destinationId: null,
    });
    expect(parsePushPayload({ ...valid, destinationType: null, destinationId: null })).toEqual({
      ...valid,
      destinationType: null,
      destinationId: null,
    });
  });

  it("keeps only the known fields", () => {
    expect(parsePushPayload({ ...valid, scopeKey: "@emma-pilates/client" })).toEqual(valid);
  });

  it.each([
    ["no payload", null],
    ["a string", "booking"],
    ["a malformed notification id", { ...valid, notificationId: "1" }],
    ["a malformed destination id", { ...valid, destinationId: "../payments" }],
    ["an unsafe type", { ...valid, type: "Waitlist Promoted" }],
    ["an unsafe destination type", { ...valid, destinationType: "https://evil.example" }],
    ["a URL in place of the type", { ...valid, type: "https://evil.example/x" }],
    ["a missing type", { ...valid, type: undefined }],
  ])("rejects %s", (_label, value) => {
    expect(parsePushPayload(value)).toBeNull();
  });
});
