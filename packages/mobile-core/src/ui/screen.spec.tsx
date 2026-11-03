import { render } from "@testing-library/react-native";

import { InsideTabBar, Screen } from "./screen";

// The safe-area view hands its host an edge → mode map; the edges in force are
// the ones not switched off.
const edgesOf = (element: { props: { edges?: Record<string, string> } }) =>
  Object.entries(element.props.edges ?? {})
    .filter(([, mode]) => mode !== "off")
    .map(([edge]) => edge);

// FIX-023: inside the tabs the tab bar already covers the bottom safe area, so a
// screen that also kept the bottom edge and its padding ended about 40 pt above
// the bar on both apps.
describe("Screen inside the tab bar (FIX-023)", () => {
  it("keeps every safe-area edge and the padding outside the tabs", async () => {
    const screen = await render(<Screen testID="app-screen" />);

    expect(edgesOf(screen.getByTestId("app-screen"))).toEqual(["top", "right", "bottom", "left"]);
    expect(screen.getByTestId("app-screen")).toHaveStyle({ padding: 16 });
  });

  it("drops the bottom edge and the bottom padding inside the tabs", async () => {
    const screen = await render(
      <InsideTabBar>
        <Screen testID="app-screen" />
      </InsideTabBar>,
    );

    expect(edgesOf(screen.getByTestId("app-screen"))).toEqual(["top", "right", "left"]);
    expect(screen.getByTestId("app-screen")).toHaveStyle({ paddingBottom: 0 });
  });

  it("lets a screen choose its own edges", async () => {
    const screen = await render(
      <InsideTabBar>
        <Screen edges={["top"]} testID="app-screen" />
      </InsideTabBar>,
    );

    expect(edgesOf(screen.getByTestId("app-screen"))).toEqual(["top"]);
  });
});
