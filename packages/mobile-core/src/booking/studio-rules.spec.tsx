import { render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Text } from "react-native";

import {
  bookingStrip,
  bookingWindowDays,
  formatCancellationWindow,
  useStudioRules,
} from "./studio-rules";

const rules = {
  cancellationWindowMinutes: 150,
  evaluationPriceCentavos: 7_000,
  plansFromPriceCentavos: 8_000,
  startDateLimitDays: 14,
  openingDate: null,
  bookingWindowDays: 7,
};

function Probe({ fetcher }: { fetcher: typeof globalThis.fetch }) {
  const studioRules = useStudioRules(fetcher);
  return (
    <Text>
      {studioRules === undefined
        ? "loading"
        : `${studioRules.cancellationWindowMinutes} ${studioRules.plansFromPriceCentavos}`}
    </Text>
  );
}

const renderProbe = (fetcher: typeof globalThis.fetch) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Probe fetcher={fetcher} />
    </QueryClientProvider>,
  );

describe("formatCancellationWindow", () => {
  it.each([
    [150, "2 h 30"],
    [180, "3 h"],
    [65, "1 h 05"],
    [45, "45 min"],
    [720, "12 h"],
  ])("writes %i minutes as «%s»", (minutes, label) => {
    expect(formatCancellationWindow(minutes)).toBe(label);
  });
});

describe("useStudioRules", () => {
  it("reads the public studio rules through the app's fetcher", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(JSON.stringify(rules)));
    const screen = await renderProbe(fetcher);

    await waitFor(() => expect(screen.getByText("150 8000")).toBeOnTheScreen());
    expect(fetcher).toHaveBeenCalledWith("/api/v1/studio-rules", expect.anything());
  });

  it("stays unknown when the rules cannot be read", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response("", { status: 503 }));
    const screen = await renderProbe(fetcher);

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(screen.getByText("loading")).toBeOnTheScreen();
  });
});

describe("bookingWindowDays", () => {
  it("follows the booking window, counting today", () => {
    expect(bookingWindowDays({ ...rules, bookingWindowDays: 3 })).toBe(3);
    expect(bookingWindowDays({ ...rules, bookingWindowDays: 30 })).toBe(30);
  });

  it("assumes the default seven days until the rules are read", () => {
    expect(bookingWindowDays(undefined)).toBe(7);
  });
});

// FIX-031 (follow-up 234): seven chips share the strip's width, so a wider
// window keeps today and five days on it and leaves the rest to «Otra».
describe("bookingStrip", () => {
  const days = (count: number) =>
    Array.from({ length: count }, (_, index) => `2026-11-${String(index + 4).padStart(2, "0")}`);

  it("puts a window of seven days or fewer on the strip", () => {
    expect(bookingStrip(days(7))).toEqual({ strip: days(7), later: [] });
    expect(bookingStrip(days(3))).toEqual({ strip: days(3), later: [] });
  });

  it("leaves the days after the sixth to «Otra» in a wider window", () => {
    expect(bookingStrip(days(14))).toEqual({
      strip: days(6),
      later: days(14).slice(6),
    });
  });
});
