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
