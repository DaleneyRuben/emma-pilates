import { cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const session = (
  sessionId: string,
  classTypeName: string,
  hour: string,
  cancellation: { cause: string; cancelledAt: string; bookedCount: number } | null = null,
) => ({
  bookedCount: cancellation === null ? 3 : 0,
  branchName: "Centro",
  capacity: 8,
  classTypeName,
  endsAt: `2026-11-05T${hour}:50:00.000Z`,
  sessionId,
  startsAt: `2026-11-05T${hour}:00:00.000Z`,
  cancellation,
});
const minimum = {
  cause: "minimum_not_met",
  cancelledAt: "2026-11-05T11:00:00.000Z",
  bookedCount: 1,
};
const studio = { cause: "studio", cancelledAt: "2026-11-04T14:12:00.000Z", bookedCount: 2 };

const profile = () =>
  jsonResponse({
    id: "staff-1",
    name: "Daniela Ortiz",
    email: "daniela@example.com",
    phone: null,
    role: "trainer",
    branches: [],
  });

const renderAgenda = (sessions: unknown[]) => {
  const fetcher = routeFetcher({
    "/api/v1/trainer/sessions": () => jsonResponse(sessions),
    "/api/v1/staff-members/current": profile,
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  });
  return { fetcher, screen: render(<App runtime={createStaffRuntime(fetcher)} />) };
};

// FIX-042 (S02 and S02b, follow-up 245): the day's cancelled classes keep
// their card, muted, with the cause and no way in.
describe("Trainer agenda with cancelled classes", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("asks for the day's cancelled classes and shows each in place, muted and closed", async () => {
    const { fetcher, screen: rendering } = renderAgenda([
      session("s-1", "Reformer Pilates", "11"),
      session("s-2", "Mat Pilates", "16", studio),
      session("s-3", "Reformer Pilates", "22"),
    ]);
    const screen = await rendering;

    await waitFor(() => {
      expect(screen.getByText("Hoy · 2 clases · 1 cancelada")).toBeOnTheScreen();
    });
    const urls = (fetcher.mock.calls as [string][]).map(([url]) => String(url));
    expect(
      urls.some(
        (url) => url.includes("/api/v1/trainer/sessions") && url.includes("includeCancelled=true"),
      ),
    ).toBe(true);
    const cancelled = screen.getByLabelText("Mat Pilates, 12:00 – 12:50, Cancelada por el estudio");
    expect(cancelled).not.toHaveProp("accessibilityRole", "button");
    expect(screen.getByText("Cancelada por el estudio")).toBeOnTheScreen();
    expect(screen.getAllByTestId("chevron", hidden)).toHaveLength(2);
  });

  it("shows a day whose classes were all cancelled instead of «Hoy no tienes clases»", async () => {
    const { screen: rendering } = renderAgenda([
      session("s-1", "Mat Pilates", "12", minimum),
      session("s-2", "Reformer Pilates", "13", minimum),
    ]);
    const screen = await rendering;

    await waitFor(() => {
      expect(screen.getByText("Hoy · 2 canceladas")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Hoy no tienes clases")).toBeNull();
    expect(screen.getAllByText("Cancelada · mínimo no alcanzado")).toHaveLength(2);
    expect(screen.queryAllByTestId("chevron", hidden)).toHaveLength(0);
  });
});
