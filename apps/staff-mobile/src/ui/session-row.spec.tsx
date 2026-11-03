import { render } from "@testing-library/react-native";

import { SessionRow } from "./session-row";

// MOB-074 walk: a fixed 56 pt column broke «07:00» in Lora 20 into «07:0» and
// «0» on the Trainer's agenda (iPhone 16 Pro).
describe("Staff SessionRow", () => {
  it("keeps the start time on one line", async () => {
    const screen = await render(
      <SessionRow
        duration="50 min"
        subtitle="Centro · sin reservas"
        time="07:00"
        title="Reformer"
      />,
    );

    expect(screen.getByText("07:00")).toHaveProp("numberOfLines", 1);
    // The column under the time grows with it instead of holding 56 pt.
    let column = screen.getByText("07:00").parent;
    while (column !== null && column.type !== "View") column = column.parent;
    expect(column).toHaveStyle({ minWidth: 56 });
    expect(column).not.toHaveStyle({ width: 56 });
  });
});
