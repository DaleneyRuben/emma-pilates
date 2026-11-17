import { act, render } from "@testing-library/react-native";
import { onlineManager } from "@tanstack/react-query";
import { Text } from "react-native";

import { MobileQueryProvider } from "./provider";

const banner = "Sin conexión. Mostrando la última información guardada.";

// Walkthrough n.º 71: the app nests a signed-in provider inside the app-wide
// one; offline, the screen showed the banner twice, the top one behind the
// clock.
describe("the offline banner", () => {
  afterEach(async () => {
    await act(async () => onlineManager.setOnline(true));
  });

  it("shows once, inside the top safe area, under nested providers", async () => {
    const screen = await render(
      <MobileQueryProvider>
        <MobileQueryProvider>
          <Text>Inicio</Text>
        </MobileQueryProvider>
      </MobileQueryProvider>,
    );

    await act(async () => onlineManager.setOnline(false));

    expect(screen.getAllByText(banner)).toHaveLength(1);
    let area = screen.getByText(banner).parent;
    while (area !== null && area.props.edges === undefined) area = area.parent;
    expect(area?.props.edges).toMatchObject({ top: "additive", bottom: "off" });
  });
});
