import { createSessionManager } from "./session-manager";

describe("createSessionManager", () => {
  it("restores a stored credential and resolves its current Client Account", async () => {
    const resolveCurrent = jest.fn().mockResolvedValue({
      accountId: "account-1",
      identity: { kind: "client", clientId: "client-1" },
    });
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        clear: jest.fn(),
        load: jest.fn().mockResolvedValue("stored-credential"),
        save: jest.fn(),
      },
      resolveCurrent,
      revokeCurrent: jest.fn(),
    });

    await expect(manager.restore()).resolves.toEqual({
      accountId: "account-1",
      role: "client",
    });
    expect(resolveCurrent).toHaveBeenCalledWith("stored-credential");
  });
});
