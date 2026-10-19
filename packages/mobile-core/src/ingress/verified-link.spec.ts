import { parseVerifiedLink } from "./verified-link";

describe("parseVerifiedLink", () => {
  it.each([
    [
      "https://links.emmapilates.test/client/authentication/verify-email?token=verification-secret",
      { type: "verify-email", token: "verification-secret" },
    ],
    [
      "https://links.emmapilates.test/client/authentication/activate-account?token=activation-secret",
      { type: "activate-account", token: "activation-secret" },
    ],
    [
      "https://links.emmapilates.test/client/authentication/recover-password?token=recovery-secret",
      { type: "recover-password", token: "recovery-secret" },
    ],
    [
      "https://links.emmapilates.test/client/authentication/confirm-email-change?token=change-secret",
      { type: "confirm-email-change", token: "change-secret" },
    ],
  ] as const)("maps the verified URL %s to one safe intent", (url, intent) => {
    expect(parseVerifiedLink(url, ["links.emmapilates.test"], "client")).toEqual(intent);
  });

  // ADR-0095: each app claims only the links of its own Accounts.
  it("maps a Staff link only in the Staff app", () => {
    const url =
      "https://links.emmapilates.test/staff/authentication/recover-password?token=recovery-secret";

    expect(parseVerifiedLink(url, ["links.emmapilates.test"], "staff")).toEqual({
      type: "recover-password",
      token: "recovery-secret",
    });
    expect(parseVerifiedLink(url, ["links.emmapilates.test"], "client")).toBeNull();
  });

  it.each([
    "http://links.emmapilates.test/client/authentication/verify-email?token=secret",
    "https://attacker.example/client/authentication/verify-email?token=secret",
    "https://links.emmapilates.test/unapproved?token=secret",
    "https://links.emmapilates.test/client/authentication/verify-email",
    "https://links.emmapilates.test/authentication/verify-email?token=secret",
  ])("rejects an unverified or malformed URL", (url) => {
    expect(parseVerifiedLink(url, ["links.emmapilates.test"], "client")).toBeNull();
  });
});
