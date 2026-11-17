import { ApiError } from "./problem";
import { createAdminQueryClient } from "./query-client";
import { createSessionExpiry } from "./session-expiry";

const signedOut = () =>
  Promise.reject(
    new ApiError({ status: 401, code: "authentication_required" }),
  );

describe("session expiry through the QueryClient", () => {
  it("returns to Login once however many requests find the session gone", async () => {
    const onExpired = jest.fn();
    const sessionExpiry = createSessionExpiry(onExpired);
    const queryClient = createAdminQueryClient({ sessionExpiry });

    await Promise.allSettled([
      queryClient.fetchQuery({ queryKey: ["planes"], queryFn: signedOut }),
      queryClient.fetchQuery({ queryKey: ["gastos"], queryFn: signedOut }),
      queryClient
        .getMutationCache()
        .build(queryClient, { mutationFn: signedOut })
        .execute(undefined),
    ]);

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("reports again only after a new session starts", async () => {
    const onExpired = jest.fn();
    const sessionExpiry = createSessionExpiry(onExpired);
    const queryClient = createAdminQueryClient({ sessionExpiry });

    await queryClient
      .fetchQuery({ queryKey: ["planes"], queryFn: signedOut })
      .catch(() => undefined);
    sessionExpiry.reset();
    await queryClient
      .fetchQuery({ queryKey: ["gastos"], queryFn: signedOut })
      .catch(() => undefined);

    expect(onExpired).toHaveBeenCalledTimes(2);
  });

  it("ignores a rejected Login, other problems, the startup session probe, and anything after logout", async () => {
    const onExpired = jest.fn();
    const sessionExpiry = createSessionExpiry(onExpired);
    const queryClient = createAdminQueryClient({ sessionExpiry });

    await Promise.allSettled([
      queryClient
        .getMutationCache()
        .build(queryClient, {
          mutationFn: () =>
            Promise.reject(
              new ApiError({ status: 401, code: "authentication_failed" }),
            ),
        })
        .execute(undefined),
      queryClient.fetchQuery({
        queryKey: ["prohibido"],
        queryFn: () =>
          Promise.reject(new ApiError({ status: 403, code: "access_denied" })),
      }),
      queryClient.fetchQuery({
        queryKey: ["sesion"],
        queryFn: signedOut,
        meta: { sessionProbe: true },
      }),
    ]);
    sessionExpiry.silence();
    await queryClient
      .fetchQuery({ queryKey: ["tarde"], queryFn: signedOut })
      .catch(() => undefined);

    expect(onExpired).not.toHaveBeenCalled();
  });
});

// FIX-058: a 401 from one endpoint is not proof the session ended; the
// backend's current-session read decides before anyone leaves the page.
describe("session expiry confirmed with the backend", () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const refused = new ApiError({
    status: 401,
    code: "authentication_required",
  });

  it("stays when the backend still knows the session, and reports again later", async () => {
    const onExpired = jest.fn();
    const isSignedIn = jest.fn(() => Promise.resolve(true));
    const sessionExpiry = createSessionExpiry(onExpired, { isSignedIn });

    sessionExpiry.report(refused);
    await settle();
    sessionExpiry.report(refused);
    await settle();

    expect(isSignedIn).toHaveBeenCalledTimes(2);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("returns to Login once when the backend no longer knows it", async () => {
    const onExpired = jest.fn();
    const isSignedIn = jest.fn(() => Promise.resolve(false));
    const sessionExpiry = createSessionExpiry(onExpired, { isSignedIn });

    sessionExpiry.report(refused);
    sessionExpiry.report(refused);
    await settle();

    expect(isSignedIn).toHaveBeenCalledTimes(1);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("keeps her when the backend cannot be asked, and reports again later", async () => {
    const onExpired = jest.fn();
    const isSignedIn = jest.fn(() => Promise.reject(new Error("offline")));
    const sessionExpiry = createSessionExpiry(onExpired, { isSignedIn });

    sessionExpiry.report(refused);
    await settle();
    sessionExpiry.report(refused);
    await settle();

    expect(isSignedIn).toHaveBeenCalledTimes(2);
    expect(onExpired).not.toHaveBeenCalled();
  });

  const pendingProbe = () => {
    let answer: (signedIn: boolean) => void = () => undefined;
    const isSignedIn = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
    );
    return { isSignedIn, answer: (signedIn: boolean) => answer(signedIn) };
  };

  it("ignores a probe that answers after logout, and stays silent", async () => {
    const onExpired = jest.fn();
    const probe = pendingProbe();
    const sessionExpiry = createSessionExpiry(onExpired, probe);

    sessionExpiry.report(refused);
    sessionExpiry.silence();
    probe.answer(true);
    await settle();
    sessionExpiry.report(refused);
    await settle();

    expect(probe.isSignedIn).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("ignores an old session's probe once a new session starts", async () => {
    const onExpired = jest.fn();
    const probe = pendingProbe();
    const sessionExpiry = createSessionExpiry(onExpired, probe);

    sessionExpiry.report(refused);
    sessionExpiry.reset();
    probe.answer(false);
    await settle();

    expect(onExpired).not.toHaveBeenCalled();
  });
});
