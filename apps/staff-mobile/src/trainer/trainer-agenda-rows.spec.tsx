import { cleanup, render, waitFor, within } from "@testing-library/react-native";
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

// v2 S02: the start in Lora 20 with its length, the class over «Branch · booked»,
// a pill, and a chevron.
describe("Trainer agenda rows", () => {
  afterEach(async () => {
    await cleanup();
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
    expect(screen.getByText("Reformer Pilates")).toHaveStyle({ color: "#4A4A4A", fontSize: 16 });
    expect(screen.getAllByText("10:00")[0]).toHaveStyle({
      fontFamily: "Lora_400Regular",
      fontSize: 20,
    });
    expect(screen.getAllByText("60 min")[0]).toHaveStyle({ color: "#6F6662", fontSize: 13 });
    expect(screen.getByText("Sopocachi · 6 de 8 reservados")).toHaveStyle({
      color: "#6F6662",
      fontSize: 13,
    });
    expect(screen.getByText("Hoy · 2 clases")).toBeOnTheScreen();
    const open = within(
      screen.getByRole("button", {
        name: "Reformer Pilates, 10:00 – 11:00, Sopocachi, 6 de 8 reservados, Con cupos",
      }),
    );
    expect(open.getByText("Con cupos").parent).toHaveStyle({ backgroundColor: "#F2E4E1" });
    const full = within(
      screen.getByRole("button", {
        name: "Mat Pilates, 10:00 – 11:00, Sopocachi, 8 de 8 reservados, Completa",
      }),
    );
    expect(full.getByText("Completa").parent).toHaveStyle({ backgroundColor: "#E6DBD0" });
    expect(screen.getAllByTestId("chevron", hidden)).toHaveLength(2);
  });
});
