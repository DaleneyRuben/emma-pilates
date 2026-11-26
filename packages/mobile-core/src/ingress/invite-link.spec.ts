import { parseVerifiedLink } from "./verified-link";

// Walkthrough n.º 13: the invite link a Client shares opens «Crea tu cuenta»
// with her code, in the Client app only.
describe("parseVerifiedLink for an invite", () => {
  const hosts = ["links.emmapilates.test"];

  it("reads the code from a Client invite link", () => {
    expect(
      parseVerifiedLink("https://links.emmapilates.test/client/invite/lucia", hosts, "client"),
    ).toEqual({ type: "referral-invite", token: "LUCIA" });
  });

  it("ignores it in the Staff app and refuses a malformed code", () => {
    expect(
      parseVerifiedLink("https://links.emmapilates.test/client/invite/LUCIA", hosts, "staff"),
    ).toBeNull();
    expect(
      parseVerifiedLink("https://links.emmapilates.test/client/invite/<x>", hosts, "client"),
    ).toBeNull();
    expect(
      parseVerifiedLink("https://links.emmapilates.test/client/invite/", hosts, "client"),
    ).toBeNull();
  });
});
