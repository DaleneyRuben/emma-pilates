import { renderHook } from "@testing-library/react-native";

import { useForgetLinkWhenSignedIn } from "./forget-link-when-signed-in";
import type { AuthenticationLinkIntent } from "./verified-link";

// Walkthrough n.º 17 (review): a sign-in link opened while she is signed in
// does nothing, so it must not wait to open once she signs out.
describe("useForgetLinkWhenSignedIn", () => {
  const render = async (signedIn: boolean, intent: AuthenticationLinkIntent | null) => {
    const clearIntent = jest.fn();
    await renderHook(() => useForgetLinkWhenSignedIn({ clearIntent, intent, signedIn }));
    return clearIntent;
  };

  it.each(["verify-email", "activate-account", "recover-password", "referral-invite"] as const)(
    "forgets a %s link while signed in",
    async (type) => {
      const intent = { token: "t", type };

      expect(await render(true, intent)).toHaveBeenCalledWith(intent);
    },
  );

  it("keeps an email change link, which a signed-in Client confirms", async () => {
    expect(await render(true, { token: "t", type: "confirm-email-change" })).not.toHaveBeenCalled();
  });

  it("keeps every link while signed out", async () => {
    expect(await render(false, { token: "t", type: "recover-password" })).not.toHaveBeenCalled();
  });
});
