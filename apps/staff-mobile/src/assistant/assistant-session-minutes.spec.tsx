import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia, sessionDetail } from "./assistant-fixtures";

jest.setTimeout(20_000);

// WEB-027 (booking ADR-0004): a Session owns its duration, so S08 shows the
// minutes between its start and end, not the deprecated Class Type field.
describe("Assistant Session detail duration", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the Session's own minutes", async () => {
    const startsAt = new Date(sessionDetail.startsAt);
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/sessions/session-1": () =>
        jsonResponse({
          ...sessionDetail,
          classType: { ...sessionDetail.classType, durationMinutes: 60 },
          endsAt: new Date(startsAt.getTime() + 75 * 60_000).toISOString(),
        }),
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));

    expect(await screen.findByText("75 minutos")).toBeOnTheScreen();
    expect(screen.queryByText("60 minutos")).toBeNull();
  });
});
