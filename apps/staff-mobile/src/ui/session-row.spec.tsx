import { render } from "@testing-library/react-native";

import { SessionRow } from "./session-row";

// FIX-089 (ClaseE): every staff list of classes draws the shared class row.
describe("Staff SessionRow", () => {
  it("puts the start in a Rubor box on one line and the places as quiet text", async () => {
    const screen = await render(
      <SessionRow places="3 de 8" subtitle="Centro" time="07:00" title="Reformer" />,
    );

    // MOB-074: «07:00» never breaks into «07:0» and «0».
    expect(screen.getByText("07:00")).toHaveProp("numberOfLines", 1);
    expect(screen.getByTestId("class-row-time")).toHaveStyle({
      backgroundColor: "#E7CCBF",
      minWidth: 62,
    });
    expect(screen.getByText("3 de 8")).toHaveStyle({ color: "#93615D", fontWeight: "600" });
    expect(screen.queryByTestId("exception-pill")).toBeNull();
  });

  it("draws only an exception as a pill, in place of the places", async () => {
    const screen = await render(
      <SessionRow
        exception="Completa"
        places="8 de 8"
        subtitle="Centro"
        time="07:00"
        title="Mat"
      />,
    );

    expect(screen.getByTestId("exception-pill")).toHaveStyle({ backgroundColor: "#E7CCBF" });
    expect(screen.getByText("Completa")).toBeOnTheScreen();
    expect(screen.queryByText("8 de 8")).toBeNull();
  });
});
