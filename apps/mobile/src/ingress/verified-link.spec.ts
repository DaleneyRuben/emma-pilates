import { parseVerifiedLink } from "./verified-link";

describe("parseVerifiedLink", () => {
  it.each([
    [
      "https://links.emmapilates.test/authentication/verify-email?token=verification-secret",
      { type: "verify-email", token: "verification-secret" },
    ],
    [
      "https://links.emmapilates.test/authentication/activate-account?token=activation-secret",
      { type: "activate-account", token: "activation-secret" },
    ],
    [
      "https://links.emmapilates.test/authentication/recover-password?token=recovery-secret",
      { type: "recover-password", token: "recovery-secret" },
    ],
  ] as const)("maps the verified URL %s to one safe intent", (url, intent) => {
    expect(parseVerifiedLink(url, ["links.emmapilates.test"])).toEqual(intent);
  });

  it.each([
    "http://links.emmapilates.test/authentication/verify-email?token=secret",
    "https://attacker.example/authentication/verify-email?token=secret",
    "https://links.emmapilates.test/unapproved?token=secret",
    "https://links.emmapilates.test/authentication/verify-email",
  ])("rejects an unverified or malformed URL", (url) => {
    expect(parseVerifiedLink(url, ["links.emmapilates.test"])).toBeNull();
  });
});
