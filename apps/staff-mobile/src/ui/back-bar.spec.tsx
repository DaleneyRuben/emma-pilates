import { render } from "@testing-library/react-native";
import { Polyline } from "react-native-svg";

import { BackBar } from "./back-bar";

// A pushed screen's BackBar usually sits in a ScrollView inside a padded
// Screen. A scroll view clips what overflows it, so the chevron pulled 10 to
// the left lost its left half on the emulator (MOB-074): it stays inside now.
describe("BackBar", () => {
  it("keeps the chevron inside the screen's content edge", async () => {
    const screen = await render(<BackBar back="Mi agenda" onBack={jest.fn()} title="Reformer" />);

    const back = screen.getByTestId("back-bar");
    expect(back).not.toHaveStyle({ marginLeft: -10 });
    const points = String(screen.UNSAFE_getByType(Polyline).props.points);
    const xs = points.split(" ").map((point) => Number(point.split(",")[0]));
    expect(Math.min(...xs)).toBeLessThanOrEqual(1.5);
  });
});
