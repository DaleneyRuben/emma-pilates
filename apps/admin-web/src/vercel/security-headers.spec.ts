import { readFileSync } from "node:fs";
import { join } from "node:path";
import { securityHeaders } from "../../security-headers";

// WEB-030: the admin web shows personal data and exports contacts, so every
// page carries a Content-Security-Policy that also forbids framing, and the
// usual hardening headers. Vercel reads them from vercel.json; `vite preview`
// (the Playwright journeys) reads the same list, so the two must agree.
type VercelConfig = {
  headers?: { source: string; headers: { key: string; value: string }[] }[];
};

const vercel = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "vercel.json"), "utf8"),
) as VercelConfig;

const deployed = () =>
  Object.fromEntries(
    (
      vercel.headers?.find(({ source }) => source === "/(.*)")?.headers ?? []
    ).map(({ key, value }) => [key, value]),
  );

describe("the admin web's security headers", () => {
  it("are what vercel.json sends on every path", () => {
    expect(deployed()).toEqual(securityHeaders);
  });

  it("forbid framing, foreign scripts, and plugins", () => {
    const policy = securityHeaders["Content-Security-Policy"] ?? "";
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).not.toContain("unsafe-eval");
    expect(securityHeaders["X-Frame-Options"]).toBe("DENY");
  });

  it("keep content types, referrers, and HTTPS strict", () => {
    expect(securityHeaders["X-Content-Type-Options"]).toBe("nosniff");
    expect(securityHeaders["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(securityHeaders["Strict-Transport-Security"]).toMatch(
      /^max-age=\d{8,}/,
    );
  });
});
