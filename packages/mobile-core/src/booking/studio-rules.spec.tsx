import { render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Text } from "react-native";

import { formatCancellationWindow, useStudioRules } from "./studio-rules";

const rules = {
  cancellationWindowMinutes: 150,
  evaluationPriceCentavos: 7_000,
  plansFromPriceCentavos: 8_000,
  startDateLimitDays: 14,
  openingDate: null,
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
