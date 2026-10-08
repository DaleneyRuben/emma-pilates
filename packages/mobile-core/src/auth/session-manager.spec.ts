import { createSessionManager } from "./session-manager";

describe("createSessionManager", () => {
  it.each([
    ["client", "staff"],
    ["staff", "client"],
  ] as const)(
    "rejects a %s application credential resolved as a %s identity",
    async (applicationIdentity, resolvedIdentity) => {
      const clear = jest.fn();
      const revokeCurrent = jest.fn();
      const identity =
        resolvedIdentity === "client"
          ? { kind: "client" as const, clientId: "client-1" }
          : {
              branchIds: ["branch-1"],
              kind: "staff" as const,
              role: "trainer" as const,
              staffMemberId: "staff-1",
            };
      const manager = createSessionManager({
        acceptedIdentityKind: applicationIdentity,
        clearAccountCache: jest.fn(),
        credentialStore: {
          clear,
          load: jest.fn(),
          save: jest.fn(),
        },
        resolveCurrent: jest.fn().mockResolvedValue({
          accountId: "account-1",
          identity,
        }),
        revokeCurrent,
      });

      await expect(manager.start("wrong-application-credential")).resolves.toBeNull();
      expect(revokeCurrent).toHaveBeenCalledWith("wrong-application-credential");
      expect(clear).toHaveBeenCalledTimes(1);
    },
  );

  it("detects a biometric session without unlocking it during startup", async () => {
    const loadWithBiometrics = jest.fn().mockResolvedValue("protected-credential");
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        canUseBiometrics: () => true,
        clear: jest.fn(),
        hasBiometricCredential: jest.fn().mockResolvedValue(true),
        load: jest.fn().mockResolvedValue(null),
        loadWithBiometrics,
        save: jest.fn(),
        saveWithBiometrics: jest.fn(),
      },
      resolveCurrent: jest.fn(),
      revokeCurrent: jest.fn(),
    });

    await expect(manager.restore()).resolves.toBeNull();
    await expect(manager.hasBiometricSession()).resolves.toBe(true);
    expect(loadWithBiometrics).not.toHaveBeenCalled();
  });

  it("unlocks a protected credential and resolves its current Account", async () => {
    const loadWithBiometrics = jest.fn().mockResolvedValue("protected-credential");
    const resolveCurrent = jest.fn().mockResolvedValue({
      accountId: "account-1",
      identity: { kind: "client", clientId: "client-1" },
    });
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        clear: jest.fn(),
        hasBiometricCredential: jest.fn().mockResolvedValue(true),
        load: jest.fn(),
        loadWithBiometrics,
        save: jest.fn(),
        saveWithBiometrics: jest.fn(),
      },
      resolveCurrent,
      revokeCurrent: jest.fn(),
    });

    await expect(manager.unlockWithBiometrics()).resolves.toEqual({
      accountId: "account-1",
      role: "client",
    });
    expect(loadWithBiometrics).toHaveBeenCalledTimes(1);
    expect(resolveCurrent).toHaveBeenCalledWith("protected-credential");
  });

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

  it("removes a credential rejected during restoration", async () => {
    const clear = jest.fn();
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        clear,
        load: jest.fn().mockResolvedValue("rejected-credential"),
        save: jest.fn(),
      },
      resolveCurrent: jest.fn().mockResolvedValue(null),
      revokeCurrent: jest.fn(),
    });

    await expect(manager.restore()).resolves.toBeNull();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("persists a new credential before resolving its Staff Role", async () => {
    const save = jest.fn();
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        clear: jest.fn(),
        load: jest.fn(),
        save,
      },
      resolveCurrent: jest.fn().mockResolvedValue({
        accountId: "account-2",
        identity: {
          kind: "staff",
          staffMemberId: "staff-1",
          role: "trainer",
          branchIds: ["branch-1"],
        },
      }),
      revokeCurrent: jest.fn(),
    });

    await expect(manager.start("new-credential")).resolves.toEqual({
      accountId: "account-2",
      role: "trainer",
    });
    expect(save).toHaveBeenCalledWith("new-credential");
  });

  it("protects a newly authenticated session when biometrics are selected", async () => {
    const save = jest.fn();
    const saveWithBiometrics = jest.fn();
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        clear: jest.fn(),
        load: jest.fn(),
        save,
        saveWithBiometrics,
      },
      resolveCurrent: jest.fn().mockResolvedValue({
        accountId: "account-2",
        identity: {
          kind: "staff",
          staffMemberId: "staff-1",
          role: "trainer",
          branchIds: ["branch-1"],
        },
      }),
      revokeCurrent: jest.fn(),
    });

    await manager.start("new-credential", {
      protectWithBiometrics: true,
    });

    expect(saveWithBiometrics).toHaveBeenCalledWith("new-credential");
    expect(save).not.toHaveBeenCalled();
  });

  it("revokes the current session and clears its credential and Account cache", async () => {
    const clearAccountCache = jest.fn();
    const clearCredential = jest.fn();
    const revokeCurrent = jest.fn();
    const manager = createSessionManager({
      clearAccountCache,
      credentialStore: {
        clear: clearCredential,
        load: jest.fn().mockResolvedValue("stored-credential"),
        save: jest.fn(),
      },
      resolveCurrent: jest.fn(),
      revokeCurrent,
    });

    await manager.logout({ accountId: "account-1", role: "client" });

    expect(revokeCurrent).toHaveBeenCalledWith("stored-credential");
    expect(clearCredential).toHaveBeenCalledTimes(1);
    expect(clearAccountCache).toHaveBeenCalledWith("account-1");
  });

  it("revokes an unlocked biometric session without prompting a second time", async () => {
    const loadWithBiometrics = jest.fn().mockResolvedValue("protected-credential");
    const revokeCurrent = jest.fn();
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        clear: jest.fn(),
        load: jest.fn().mockResolvedValue(null),
        loadWithBiometrics,
        save: jest.fn(),
      },
      resolveCurrent: jest.fn().mockResolvedValue({
        accountId: "account-1",
        identity: { kind: "client", clientId: "client-1" },
      }),
      revokeCurrent,
    });

    const session = await manager.unlockWithBiometrics();
    await manager.logout(session!);

    expect(revokeCurrent).toHaveBeenCalledWith("protected-credential");
    expect(loadWithBiometrics).toHaveBeenCalledTimes(1);
  });

  it("ends a session the server already revoked without calling it again", async () => {
    const clearAccountCache = jest.fn();
    const clearCredential = jest.fn();
    const revokeCurrent = jest.fn();
    const manager = createSessionManager({
      clearAccountCache,
      credentialStore: {
        clear: clearCredential,
        load: jest.fn().mockResolvedValue("stored-credential"),
        save: jest.fn(),
      },
      resolveCurrent: jest.fn(),
      revokeCurrent,
    });

    await manager.endLocally({ accountId: "account-1", role: "client" });

    expect(revokeCurrent).not.toHaveBeenCalled();
    expect(clearCredential).toHaveBeenCalledTimes(1);
    expect(clearAccountCache).toHaveBeenCalledWith("account-1");
  });
});
