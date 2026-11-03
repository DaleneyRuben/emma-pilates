import { render } from "@testing-library/react-native";

import { RescheduleOption } from "./reschedule-option";
import { SessionRow } from "./session-row";

const session = {
  availableSeats: 14,
  branchId: "branch-centro",
  branchName: "Centro",
  bookedCount: 0,
  capacity: 14,
  classTypeId: "class-mat",
  classTypeName: "Mat Pilates",
  endsAt: "2026-11-03T13:50:00.000Z",
  id: "session-1",
  startsAt: "2026-11-03T13:00:00.000Z",
  trainerName: "Daniela Ortiz",
  trainerStaffMemberId: "trainer-1",
  waitlistCount: 0,
};

// Lora's digits run wider on Android: a fixed 56-wide column broke «09:00»
// into «09:0» over «0» on the emulator (MOB-074). The start keeps one line.
describe("the start time of a class row", () => {
  it("stays on one line in the class list", async () => {
    const screen = await render(
      <SessionRow accessibilityLabel="Mat Pilates" onPress={jest.fn()} session={session} />,
    );

    const time = screen.getByText("09:00", { includeHiddenElements: true });
    expect(time.props.numberOfLines).toBe(1);
    expect(time).toHaveStyle({ minWidth: 56 });
    expect(time).not.toHaveStyle({ width: 56 });
  });

  it("stays on one line among the reschedule options", async () => {
    const screen = await render(
      <RescheduleOption onPress={jest.fn()} selected={false} session={session} />,
    );

    const time = screen.getByText("09:00", { includeHiddenElements: true });
    expect(time.props.numberOfLines).toBe(1);
    expect(time).toHaveStyle({ minWidth: 52 });
    expect(time).not.toHaveStyle({ width: 52 });
  });
});
