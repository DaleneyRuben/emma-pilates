import { act, renderHook } from "@testing-library/react-native";

import { usePendingUntilReady } from "./pending-open";

describe("usePendingUntilReady", () => {
  it("holds a cold-start tap until navigation is ready, then opens it once", async () => {
    const open = jest.fn();
    const { result } = await renderHook(() => usePendingUntilReady(open));

    await act(async () => result.current.deliver("first"));
    await act(async () => result.current.deliver("latest"));
    expect(open).not.toHaveBeenCalled();

    await act(async () => result.current.onReady());
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("latest");
  });

  it("opens at once when navigation is already ready", async () => {
    const open = jest.fn();
    const { result } = await renderHook(() => usePendingUntilReady(open));

    await act(async () => result.current.onReady());
    await act(async () => result.current.deliver("warm"));

    expect(open).toHaveBeenCalledWith("warm");
    await act(async () => result.current.onReady());
    expect(open).toHaveBeenCalledTimes(1);
  });
});
