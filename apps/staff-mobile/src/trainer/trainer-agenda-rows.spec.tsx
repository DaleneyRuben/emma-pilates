import { cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const session = (sessionId: string, classTypeName: string, bookedCount: number) => ({
  bookedCount,
  branchName: "Sopocachi",
  capacity: 8,
  classTypeName,
  endsAt: "2026-09-10T15:00:00.000Z",
  sessionId,
  startsAt: "2026-09-10T14:00:00.000Z",
});

// MOB-042: S02's agenda card ends in the chevron beside the time and title,
// names the Branch after a pin, and closes with the booked count and a pill.
describe("Trainer agenda rows", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws the agenda card as the frame does", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/trainer/sessions": () =>
              jsonResponse([
                session("session-1", "Reformer Pilates", 6),
                session("session-2", "Mat Pilates", 8),
              ]),
            "/api/v1/staff-members/current": () =>
              jsonResponse({
                id: "staff-1",
                name: "Emma Vargas",
                email: "emma.vargas@example.com",
                phone: null,
                role: "trainer",
                branches: [],
              }),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
          }),
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
    });
    expect(screen.getByText("Reformer Pilates")).toHaveStyle({
      color: "#4A4A4A",
      fontFamily: "Lora_500Medium",
      fontSize: 20,
    });
    expect(screen.getAllByText(/^10:00/)[0]).toHaveStyle({
      color: "#766D69",
      fontSize: 13,
      fontWeight: "500",
    });
    expect(screen.getAllByText("Sopocachi")[0]).toHaveStyle({ color: "#766D69", fontSize: 13 });
    expect(screen.getAllByTestId("glyph-pin", hidden)[0]).toHaveProp("width", 15);
    expect(screen.getByText("6 de 8 reservados")).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(screen.getAllByTestId("glyph-person", hidden)[0]).toHaveProp("width", 17);
    expect(screen.getAllByTestId("card-footer")[0]).toHaveStyle({ paddingTop: 13 });
    expect(screen.getByText("Con cupos")).toHaveStyle({ color: "#6E6663" });
    expect(screen.getByText("Con cupos").parent).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.34)",
    });
    expect(screen.getByText("Completa")).toHaveStyle({ color: "#5F7457" });
    const chevrons = screen.getAllByTestId("chevron", hidden);
    expect(chevrons).toHaveLength(2);
    expect(chevrons[0]).toHaveProp("stroke", "#B78380");
    expect(chevrons[0]).toHaveProp("width", 19);
  });
});
