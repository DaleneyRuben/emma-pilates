import { renderHook } from "@testing-library/react-native";

import { useMountedAt } from "./mounted-at";

// MOB-052: a screen judges «now» once, when it appears, so render stays pure.
describe("useMountedAt", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reads the clock once and keeps that instant across re-renders", async () => {
    const now = jest
      .spyOn(Date, "now")
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValue(3_000);
    const { rerender, result } = await renderHook(() => useMountedAt());

    expect(result.current).toBe(1_000);
    await rerender(undefined);
    await rerender(undefined);
    expect(result.current).toBe(1_000);
    expect(now).toHaveBeenCalledTimes(1);
  });

  it("reads it again for a new mount", async () => {
    jest.spyOn(Date, "now").mockReturnValueOnce(1_000).mockReturnValueOnce(2_000);
    const first = await renderHook(() => useMountedAt());
    await first.unmount();
    const second = await renderHook(() => useMountedAt());

    expect(first.result.current).toBe(1_000);
    expect(second.result.current).toBe(2_000);
  });
});
