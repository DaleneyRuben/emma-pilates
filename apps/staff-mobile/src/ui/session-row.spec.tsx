import { render } from "@testing-library/react-native";

import { SessionRow } from "./session-row";

// Rosa Emma: every staff list of classes draws the shared class row.
describe("Staff SessionRow", () => {
  it("puts the type bar and the start in Lora on one line, and the places in bold", async () => {
    const screen = await render(
      <SessionRow places="3 de 8" subtitle="Centro" time="07:00" title="Reformer" />,
    );

    // MOB-074: «07:00» never breaks into «07:0» and «0».
    expect(screen.getByText("07:00")).toHaveProp("numberOfLines", 1);
    expect(screen.getByTestId("class-row-time")).toHaveStyle({
      fontFamily: "Lora_400Regular",
      minWidth: 62,
    });
    expect(screen.getByTestId("type-bar")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(screen.getByText("3 de 8")).toHaveStyle({ color: "#93615D", fontWeight: "700" });
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

    expect(screen.getByTestId("exception-pill")).toHaveStyle({ backgroundColor: "#FEF6F2" });
    expect(screen.getByText("Completa")).toBeOnTheScreen();
    expect(screen.queryByText("8 de 8")).toBeNull();
  });
});
