import { fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";

import {
  TabBarButton,
  tabBarItemStyle,
  tabBarPillHeight,
  tabBarStyleFor,
  tabBarTints,
} from "./tab-bar";
import { Text } from "./text";

// Rosa Emma (C02, E-D01): the open tab is a 600 pill on the white bar.
describe("TabBarButton", () => {
  it("wraps the open tab's icon and label in a 600 pill", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <TabBarButton aria-selected onPress={onPress} testID="tab-home">
        <Text tone="onDark" variant="pastilla">
          Inicio
        </Text>
      </TabBarButton>,
    );

    // Owner, 2026-11-20: the open pill is clearly wider than its label.
    expect(screen.getByTestId("open-tab-pill")).toHaveStyle({
      backgroundColor: "#93615D",
      borderRadius: 16,
      maxWidth: "100%",
      minWidth: 72,
      paddingHorizontal: 16,
    });
    await fireEvent.press(screen.getByTestId("tab-home"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("leaves the other tabs bare", async () => {
    const screen = await render(
      <TabBarButton aria-selected={false}>
        <Text variant="pastilla">Perfil</Text>
      </TabBarButton>,
    );

    expect(screen.queryByTestId("open-tab-pill")).toBeNull();
  });

  it("draws the bar white with white tints on the pill", () => {
    expect(tabBarStyleFor({ bottom: 34 }).backgroundColor).toBe("#FFFBFB");
    expect(tabBarTints).toEqual({
      tabBarActiveTintColor: "#FFFBFB",
      tabBarInactiveTintColor: "#93615D",
    });
  });

  // Boards E-C04, E-F05: each tab is as wide as its label, so «Para
  // contactar» and «Disponibilidad» fit whole at 12 pt; the rest of the bar is
  // shared out evenly.
  it("sizes each tab from its label and shares out the rest", () => {
    expect(tabBarItemStyle).toEqual({ flex: 0, flexBasis: "auto", flexGrow: 1, flexShrink: 1 });
  });

  // The tab bar walk (2026-11-20): the pill sat low against the iPhone's home
  // indicator with room above it, and touched the iPad's home bar.
  it("gives the tab the pill's height, without the item's own padding", async () => {
    const screen = await render(
      <TabBarButton aria-selected style={{ padding: 5 }} testID="tab-home">
        <Text tone="onDark" variant="pastilla">
          Inicio
        </Text>
      </TabBarButton>,
    );

    expect(screen.getByTestId("tab-home")).toHaveStyle({ paddingVertical: 0 });
    // 8 above and below, the 28 pt icon box, a 3 pt gap and the 14 pt label.
    expect(tabBarPillHeight()).toBe(61);
  });

  // Owner, 2026-11-20: the full 34 pt inset left too much room under the
  // labels; 14 pt of it is spared, never leaving less than the 8 pt above.
  it("pads the pill above and below with the home indicator's spare room", () => {
    const iPhone = tabBarStyleFor({ bottom: 34 });
    expect(iPhone).toMatchObject({ height: 8 + 61 + 20, paddingBottom: 20, paddingTop: 8 });

    const iPad = tabBarStyleFor({ bottom: 20 });
    expect(iPad).toMatchObject({ height: 8 + 61 + 8, paddingBottom: 8, paddingTop: 8 });

    const noIndicator = tabBarStyleFor({ bottom: 0 });
    expect(noIndicator).toMatchObject({ height: 8 + 61 + 8, paddingBottom: 8, paddingTop: 8 });
  });

  it("grows with the text size up to the scale's limit", () => {
    expect(tabBarPillHeight(1.2)).toBe(64);
    expect(tabBarPillHeight(2)).toBe(tabBarPillHeight(1.3));
    expect(tabBarStyleFor({ bottom: 0 }, 1.2).height).toBe(8 + 64 + 8);
  });

  it("keeps Android's slimmer pill and tighter bar clear of its system bar", () => {
    jest.replaceProperty(Platform, "OS", "android");
    // 2 above and below, the icon box, a 1 pt gap and the label.
    expect(tabBarPillHeight()).toBe(47);
    expect(tabBarStyleFor({ bottom: 24 })).toMatchObject({
      height: 4 + 47 + 4 + 24,
      paddingBottom: 4 + 24,
      paddingTop: 4,
    });
    jest.restoreAllMocks();
  });
});
