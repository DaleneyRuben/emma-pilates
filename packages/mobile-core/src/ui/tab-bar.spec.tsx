import { fireEvent, render } from "@testing-library/react-native";

import { TabBarButton, tabBarItemStyle, tabBarStyle, tabBarTints } from "./tab-bar";
import { Text } from "./text";

// Rosa Emma (C02, E-D01): the open tab is a 600 pill on the white bar.
describe("TabBarButton", () => {
  it("wraps the open tab's icon and label in a 600 pill", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <TabBarButton aria-selected onPress={onPress} testID="tab-home">
        <Text variant="pastilla">Inicio</Text>
      </TabBarButton>,
    );

    expect(screen.getByTestId("open-tab-pill")).toHaveStyle({
      backgroundColor: "#93615D",
      borderRadius: 16,
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
    expect(tabBarStyle.backgroundColor).toBe("#FFFBFB");
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
});
