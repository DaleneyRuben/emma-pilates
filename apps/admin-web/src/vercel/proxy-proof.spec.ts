import { withProxyProof } from "./proxy-proof";

describe("ADR-0087 proxy proof", () => {
  it("adds the configured secret to the forwarded request", () => {
    const headers = withProxyProof(
      new Headers({ origin: "https://admin.example" }),
      "s".repeat(40),
    );

    expect(headers.get("x-pilates-proxy-proof")).toBe("s".repeat(40));
    expect(headers.get("origin")).toBe("https://admin.example");
  });

  it("never forwards a proof the browser sent itself", () => {
    const sent = new Headers({ "x-pilates-proxy-proof": "forged" });

    expect(withProxyProof(sent, undefined).has("x-pilates-proxy-proof")).toBe(
      false,
    );
    expect(
      withProxyProof(sent, "s".repeat(40)).get("x-pilates-proxy-proof"),
    ).toBe("s".repeat(40));
  });
});
