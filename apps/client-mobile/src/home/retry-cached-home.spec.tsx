import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useRetryCachedHome } from "./retry-cached-home";

// Walkthrough finding 99: with the API down and the phone's network up, the
// banner stayed until a pull, because nothing asked the server again.
const keys = [["profile"], ["subscription"]] as const;

const setup = (showingCachedHome: boolean, retryMilliseconds = 20) => {
  const queryClient = new QueryClient();
  const refetch = jest.spyOn(queryClient, "refetchQueries").mockResolvedValue(undefined);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, refetch, wrapper, retryMilliseconds, showingCachedHome };
};

describe("useRetryCachedHome", () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("asks the server again every few seconds while Inicio shows saved data", async () => {
    const { refetch, wrapper, retryMilliseconds } = setup(true);

    await renderHook(() => useRetryCachedHome(true, keys, retryMilliseconds), { wrapper });

    await waitFor(() => expect(refetch.mock.calls.length).toBeGreaterThanOrEqual(2 * keys.length));
    expect(refetch).toHaveBeenCalledWith({ queryKey: ["profile"], type: "active" });
    expect(refetch).toHaveBeenCalledWith({ queryKey: ["subscription"], type: "active" });
  });

  it("asks again when the app comes back to the foreground", async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      onChange = listener as (state: AppStateStatus) => void;
      return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
    });
    const { refetch, wrapper } = setup(true);

    await renderHook(() => useRetryCachedHome(true, keys, 60_000), { wrapper });
    expect(refetch).not.toHaveBeenCalled();
    await act(async () => onChange?.("active"));

    expect(refetch).toHaveBeenCalledWith({ queryKey: ["profile"], type: "active" });
  });

  it("stays quiet while Inicio shows fresh data", async () => {
    const { refetch, wrapper } = setup(false);

    await renderHook(() => useRetryCachedHome(false, keys, 10), { wrapper });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 60);
      });
    });

    expect(refetch).not.toHaveBeenCalled();
  });
});
