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

  it("detects biometrics without opening the prompt during startup", async () => {
    const readUnlockSecret = jest.fn().mockResolvedValue("unlock-secret");
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        canUseBiometrics: () => true,
        clear: jest.fn(),
        hasBiometricKey: jest.fn().mockResolvedValue(true),
        load: jest.fn().mockResolvedValue(null),
        readUnlockSecret,
        save: jest.fn(),
      },
      resolveCurrent: jest.fn(),
      revokeCurrent: jest.fn(),
    });

    await expect(manager.restore()).resolves.toBeNull();
    await expect(manager.hasBiometricSession()).resolves.toBe(true);
    expect(readUnlockSecret).not.toHaveBeenCalled();
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

  it("releases this phone's push device before the session ends, and signs out if that fails", async () => {
    const calls: string[] = [];
    const releaseDevice = jest.fn(async () => {
      calls.push("release");
      throw new Error("offline");
    });
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        clear: jest.fn(),
        load: jest.fn().mockResolvedValue("stored-credential"),
        save: jest.fn(),
      },
      releaseDevice,
      resolveCurrent: jest.fn(),
      revokeCurrent: jest.fn(async () => void calls.push("revoke")),
    });

    await manager.logout({ accountId: "account-1", role: "client" });

    expect(releaseDevice).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["release", "revoke"]);
  });

  it("signs out after five seconds when releasing the push device hangs", async () => {
    jest.useFakeTimers();
    const revokeCurrent = jest.fn().mockResolvedValue(undefined);
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: {
        clear: jest.fn(),
        load: jest.fn().mockResolvedValue("stored-credential"),
        save: jest.fn(),
      },
      releaseDevice: () => new Promise<void>(() => undefined),
      resolveCurrent: jest.fn(),
      revokeCurrent,
    });

    const logout = manager.logout({ accountId: "account-1", role: "client" });
    await jest.advanceTimersByTimeAsync(5_000);
    await logout;

    expect(revokeCurrent).toHaveBeenCalledWith("stored-credential");
    jest.useRealTimers();
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

describe("createSessionManager under an Impersonation (FUT-001)", () => {
  const impersonation = {
    id: "impersonation-1",
    staffMemberId: "staff-2",
    staffMemberName: "Camila Rojas",
    role: "trainer" as const,
    expiresAt: "2026-10-22T15:30:00.000Z",
  };
  const actingPrincipal = {
    accountId: "trainer-account",
    identity: {
      branchIds: ["branch-1"],
      kind: "staff" as const,
      role: "trainer" as const,
      staffMemberId: "staff-2",
    },
    impersonation,
  };

  it("carries the Impersonation beside the acting Role", async () => {
    const manager = createSessionManager({
      acceptedIdentityKind: "staff",
      clearAccountCache: jest.fn(),
      credentialStore: { clear: jest.fn(), load: jest.fn(), save: jest.fn() },
      resolveCurrent: jest.fn().mockResolvedValue(actingPrincipal),
      revokeCurrent: jest.fn(),
    });

    await expect(manager.start("credential")).resolves.toEqual({
      accountId: "trainer-account",
      role: "trainer",
      impersonation,
    });
  });

  it("refreshes the session from the same credential once the Impersonation ends", async () => {
    const resolveCurrent = jest
      .fn()
      .mockResolvedValueOnce(actingPrincipal)
      .mockResolvedValueOnce({
        accountId: "administrator-account",
        identity: {
          branchIds: [],
          kind: "staff" as const,
          role: "administrator" as const,
          staffMemberId: "staff-1",
        },
      });
    const manager = createSessionManager({
      acceptedIdentityKind: "staff",
      clearAccountCache: jest.fn(),
      credentialStore: { clear: jest.fn(), load: jest.fn(), save: jest.fn() },
      resolveCurrent,
      revokeCurrent: jest.fn(),
    });

    await manager.start("credential");
    await expect(manager.refresh()).resolves.toEqual({
      accountId: "administrator-account",
      role: "administrator",
    });
    expect(resolveCurrent).toHaveBeenLastCalledWith("credential");
  });

  it("refreshes from the stored credential when none is active and answers null without one", async () => {
    const load = jest.fn().mockResolvedValueOnce("stored").mockResolvedValueOnce(null);
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: { clear: jest.fn(), load, save: jest.fn() },
      resolveCurrent: jest.fn().mockResolvedValue(actingPrincipal),
      revokeCurrent: jest.fn(),
    });

    await expect(manager.refresh()).resolves.toMatchObject({ role: "trainer" });
    await expect(manager.refresh()).resolves.toMatchObject({ role: "trainer" });
    await expect(
      createSessionManager({
        clearAccountCache: jest.fn(),
        credentialStore: {
          clear: jest.fn(),
          load: jest.fn().mockResolvedValue(null),
          save: jest.fn(),
        },
        resolveCurrent: jest.fn(),
        revokeCurrent: jest.fn(),
      }).refresh(),
    ).resolves.toBeNull();
  });
});
