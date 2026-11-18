import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { impersonationBannerHeight } from "./impersonation-banner";
import { ImpersonationFrame } from "./impersonation-frame";

const statusBar = 54;
const homeIndicator = 34;
const metrics = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: statusBar, right: 0, bottom: homeIndicator, left: 0 },
};

function InsetsProbe() {
  const insets = useSafeAreaInsets();
  return <Text testID="probe">{`top ${insets.top} · bottom ${insets.bottom}`}</Text>;
}

// Walkthrough finding 115 (FIX-080): the banner already covers the status
// bar, and the screens start under it, so a screen's own top safe area must
// not count the status bar a second time.
describe("ImpersonationFrame", () => {
  it("pushes the screens under the banner once and leaves them no top inset", async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ImpersonationFrame
          banner={<Text testID="banner">Viendo como Camila Rojas</Text>}
        >
          <InsetsProbe />
        </ImpersonationFrame>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("probe")).toHaveTextContent(`top 0 · bottom ${homeIndicator}`);
    expect(screen.getByTestId("impersonation-screens")).toHaveStyle({
      paddingTop: statusBar + impersonationBannerHeight,
    });
    expect(screen.getByTestId("banner")).toBeOnTheScreen();
  });
});
