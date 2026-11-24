import { render } from "@testing-library/react-native";
import { Dimensions, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  Screen,
  ScreenHeader,
  SplitPanels,
  TabletColumn,
  TabletColumns,
  TabletGrid,
  tabletMinimumWidth,
  WideScreens,
} from "../index";
import { textVariants } from "./type-scale";

const metrics = {
  frame: { height: 1194, width: 834, x: 0, y: 0 },
  insets: { bottom: 20, left: 0, right: 0, top: 24 },
};

function windowWidth(width: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

afterEach(() => jest.restoreAllMocks());

// Follow-up 289: one breakpoint for both apps, the Staff app's 768 pt.
describe("tablet layout", () => {
  it("switches at 768 pt", () => {
    expect(tabletMinimumWidth).toBe(768);
  });

  it("adds nothing around a phone's content", async () => {
    windowWidth(767);
    const screen = await render(
      <View testID="parent">
        <TabletColumn width={560}>
          <View testID="a" />
        </TabletColumn>
        <TabletColumns left={<View testID="b" />} right={<View testID="c" />} />
        <TabletGrid>
          <View testID="d" />
          <View testID="e" />
        </TabletGrid>
      </View>,
      { wrapper: WideScreens },
    );

    expect(screen.queryByTestId("tablet-column")).toBeNull();
    expect(screen.queryByTestId("tablet-columns")).toBeNull();
    expect(screen.queryByTestId("tablet-grid")).toBeNull();
    const parent = screen.getByTestId("parent");
    expect(
      parent.children.map(
        (child) => (child as unknown as { props: { testID: string } }).props.testID,
      ),
    ).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("centres a single-purpose screen in its column on a tablet", async () => {
    windowWidth(834);
    const screen = await render(
      <TabletColumn width={480}>
        <View testID="form" />
      </TabletColumn>,
      { wrapper: WideScreens },
    );

    expect(screen.getByTestId("tablet-column")).toHaveStyle({ alignSelf: "center", maxWidth: 480 });
  });

  it("sets two stacks side by side, or 300 pt and the rest", async () => {
    windowWidth(834);
    const screen = await render(
      <TabletColumns left={<View />} leftWidth={300} right={<View />} />,
      { wrapper: WideScreens },
    );

    expect(screen.getByTestId("tablet-columns")).toHaveStyle({ flexDirection: "row", gap: 16 });
    expect(screen.getByTestId("tablet-columns-left")).toHaveStyle({ width: 300 });
    expect(screen.getByTestId("tablet-columns-right")).toHaveStyle({ flex: 1 });
  });

  it("puts repeated cards two to a row, the odd one alone", async () => {
    windowWidth(834);
    const screen = await render(
      <TabletGrid>
        <View testID="one" />
        <View testID="two" />
        <View testID="three" />
      </TabletGrid>,
      { wrapper: WideScreens },
    );

    const rows = screen.getByTestId("tablet-grid").children;
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId("one").parent?.parent).toBe(screen.getByTestId("two").parent?.parent);
  });

  it("draws S04's 392 pt list panel beside the detail", async () => {
    windowWidth(834);
    const screen = await render(
      <SplitPanels detail={<View testID="detail" />} list={<View testID="list" />} />,
      { wrapper: WideScreens },
    );

    expect(screen.getByTestId("split-panels-list")).toHaveStyle({ width: 392 });
    expect(screen.getByTestId("split-panels-detail")).toHaveStyle({ flex: 1 });
  });
});

describe("WideScreens", () => {
  it("gives a tablet page 40 pt margins and the back button beside a 36 pt title", async () => {
    windowWidth(834);
    const screen = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <WideScreens>
          <Screen>
            <ScreenHeader onBack={() => undefined} title="Mi plan" />
          </Screen>
        </WideScreens>
      </SafeAreaProvider>,
    );

    const title = screen.getByRole("header", { name: "Mi plan" });
    expect(title).toHaveStyle(textVariants["titulo-pagina-tablet"]);
    expect(screen.getByTestId("back-bar").parent).toBe(title.parent);
    expect(screen.getByTestId("screen-header")).toHaveStyle({ paddingHorizontal: 40 });
  });

  it("leaves the phone header and the Staff app's screens as they were", async () => {
    windowWidth(834);
    const screen = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen>
          <ScreenHeader onBack={() => undefined} title="Mi plan" />
        </Screen>
      </SafeAreaProvider>,
    );

    const title = screen.getByRole("header", { name: "Mi plan" });
    expect(title).toHaveStyle(textVariants["titulo-pagina"]);
    expect(screen.getByTestId("back-bar").parent).not.toBe(title.parent);
  });
});
