import { onlyChangedTokens } from "./token-changes";

describe("onlyChangedTokens", () => {
  it("passes on a token only when it differs from the last one seen", () => {
    const listener = jest.fn();
    const deliver = onlyChangedTokens(listener);

    deliver("token-a");
    deliver("token-a");
    deliver("token-b");
    deliver("token-b");

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
