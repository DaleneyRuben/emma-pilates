import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { TabBarButton, tabBarStyle, tabBarTints } from "./tab-bar";

// Rosa Emma (C02, E-D01): the open tab is a 600 pill on the white bar.
describe("TabBarButton", () => {
  it("wraps the open tab's icon and label in a 600 pill", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <TabBarButton aria-selected onPress={onPress} testID="tab-home">
        <Text>Inicio</Text>
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
        <Text>Perfil</Text>
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
});
