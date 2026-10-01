import {
  AuthenticationApiError,
  createAuthenticationApi,
} from "./authentication-api";

describe("createAuthenticationApi", () => {
  it("supports the pending Client registration lifecycle", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            email: "ana@example.com",
            registrationContinuation: "continuation",
            status: "verification_required",
          }),
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            email: "ana.corrected@example.com",
            status: "verification_required",
          }),
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "verification_required" }),
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createAuthenticationApi({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock,
    });

    await expect(
      api.register({
        email: "ana@example.com",
        name: "Ana Clienta",
        password: "local password",
      }),
    ).resolves.toEqual({
      email: "ana@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    });
    await expect(
      api.correctRegistrationEmail({
        email: "ana.corrected@example.com",
        registrationContinuation: "continuation",
      }),
    ).resolves.toEqual({
      email: "ana.corrected@example.com",
      status: "verification_required",
    });
    await expect(
      api.resendRegistrationVerification("continuation"),
    ).resolves.toEqual({ status: "verification_required" });
    await expect(
      api.cancelRegistration("continuation"),
    ).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.com/api/v1/client-registrations",
      "https://api.example.com/api/v1/client-registrations/email-corrections",
      "https://api.example.com/api/v1/client-registrations/verification-resends",
      "https://api.example.com/api/v1/client-registrations/cancellations",
    ]);
  });

  it("supports verification, activation, and password recovery links", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "verified" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ purpose: "activation", status: "current" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "activated" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "accepted" }), {
          status: 202,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            credential: "replacement-credential",
            status: "recovered",
          }),
          { status: 201 },
        ),
      );
    const api = createAuthenticationApi({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock,
    });

    await expect(api.verifyClientEmail("verification-token")).resolves.toEqual(
      { status: "verified" },
    );
    await expect(api.inspectLink("activation-token")).resolves.toEqual({
      purpose: "activation",
      status: "current",
    });
    await expect(
      api.activateAccount({
        password: "new password",
        token: "activation-token",
      }),
    ).resolves.toEqual({ status: "activated" });
    await expect(
      api.requestPasswordRecovery("ana@example.com"),
    ).resolves.toEqual({ status: "accepted" });
    await expect(
      api.completePasswordRecovery({
        password: "replacement password",
        token: "recovery-token",
      }),
    ).resolves.toEqual({
      credential: "replacement-credential",
      status: "recovered",
    });
  });

  it("completes an email change link (IDN-008)", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "changed" }), { status: 200 }),
      );
    const api = createAuthenticationApi({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock,
    });

    await expect(api.completeEmailChange("change-secret")).resolves.toEqual({
      status: "changed",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/email-changes",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps the problem code and the server wait of a failed request", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: "referral_code_invalid", status: 422 }),
          {
            headers: { "Content-Type": "application/problem+json" },
            status: 422,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: "rate_limit_exceeded", status: 429 }),
          {
            headers: {
              "Content-Type": "application/problem+json",
              "Retry-After": "52",
            },
            status: 429,
          },
        ),
      );
    const api = createAuthenticationApi({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock,
    });

    await expect(
      api.register({
        email: "ana@example.com",
        name: "Ana Clienta",
        password: "local password",
        referralCode: "NADIE",
      }),
    ).rejects.toMatchObject({ code: "referral_code_invalid", status: 422 });

    const limited = await api
      .requestPasswordRecovery("ana@example.com")
      .catch((error: unknown) => error);

    expect(limited).toBeInstanceOf(AuthenticationApiError);
    expect(limited).toMatchObject({
      code: "rate_limit_exceeded",
      retryAfterSeconds: 52,
      status: 429,
    });
  });

  it("identifies the installation on every request that may send an email", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: "verification_required" }), {
          status: 202,
        }),
      ),
    );
    const api = createAuthenticationApi({
      baseUrl: "https://api.example.com/api/v1",
      clientIdentifier: () => Promise.resolve("installation-1"),
      fetch: fetchMock,
    });

    await api.register({
      email: "ana@example.com",
      name: "Ana Clienta",
      password: "local password",
    });
    await api.correctRegistrationEmail({
      email: "ana.corrected@example.com",
      registrationContinuation: "continuation",
    });
    await api.resendRegistrationVerification("continuation");
    await api.requestPasswordRecovery("ana@example.com");

    expect(
      fetchMock.mock.calls.map(([, init]) =>
        new Headers(init?.headers).get(
          "x-client-identifier",
        ),
      ),
    ).toEqual([
      "installation-1",
      "installation-1",
      "installation-1",
      "installation-1",
    ]);
  });
});
