import { subscribeToVerifiedLinks } from "./link-ingress";

describe("subscribeToVerifiedLinks", () => {
  it("delivers safe intents from startup and foreground URLs", async () => {
    let receiveUrl: (event: { url: string }) => void = () => undefined;
    const remove = jest.fn();
    const onIntent = jest.fn();
    const stop = subscribeToVerifiedLinks({
      allowedHosts: ["links.emmapilates.test"],
      identityKind: "client",
      onIntent,
      source: {
        addEventListener: (_event, listener) => {
          receiveUrl = listener;
          return { remove };
        },
        getInitialURL: async () =>
          "https://links.emmapilates.test/client/authentication/verify-email?token=startup",
      },
    });

    await Promise.resolve();
    receiveUrl({
      url: "https://attacker.example/authentication/activate-account?token=ignored",
    });
    receiveUrl({
      url: "https://links.emmapilates.test/client/authentication/activate-account?token=foreground",
    });

    expect(onIntent).toHaveBeenNthCalledWith(1, {
      type: "verify-email",
      token: "startup",
    });
    expect(onIntent).toHaveBeenNthCalledWith(2, {
      type: "activate-account",
      token: "foreground",
    });

    stop();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
