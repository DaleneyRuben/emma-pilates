import { render } from "@testing-library/react-native";

import { SessionRow } from "./session-row";

// Lora's digits run wider on Android: a fixed 56-wide column broke «07:00»
// into «07:0» over «0» on Mi agenda on the emulator (MOB-074).
describe("the start time of a staff class row", () => {
  it("stays on one line in a column that can grow", async () => {
    const screen = await render(
      <SessionRow
        duration="50 min"
        subtitle="Centro · sin reservas"
        testID="row"
        time="07:00"
        title="Reformer Pilates"
      />,
    );

    const time = screen.getByText("07:00", { includeHiddenElements: true });
    expect(time.props.numberOfLines).toBe(1);
    expect(time.parent?.parent).toHaveStyle({ minWidth: 56 });
    expect(time.parent?.parent).not.toHaveStyle({ width: 56 });
  });
});
