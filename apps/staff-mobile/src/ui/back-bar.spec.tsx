import { render } from "@testing-library/react-native";

import { BackBar } from "./back-bar";

// FIX-089 (EncabezadoA): the staff app's pushed screens share the core header.
describe("BackBar", () => {
  it("keeps the chevron inside the screen's content edge (MOB-074)", async () => {
    const screen = await render(<BackBar back="Mi agenda" onBack={jest.fn()} title="Reformer" />);

    const back = screen.getByTestId("back-bar");
    expect(back).not.toHaveStyle({ marginLeft: -10 });
    const points = /"points":"([^"]+)"/.exec(JSON.stringify(screen.toJSON()))?.[1] ?? "";
    const xs = points.split(" ").map((point) => Number(point.split(",")[0]));
    expect(Math.min(...xs)).toBeLessThanOrEqual(1.5);
  });

  it("titles the screen in large Lora and never names the screen it returns to", async () => {
    const screen = await render(<BackBar back="Mi agenda" onBack={jest.fn()} title="Reformer" />);

    expect(screen.getByRole("header", { name: "Reformer" })).toHaveStyle({ fontSize: 30 });
    expect(screen.queryByText("Mi agenda")).toBeNull();
  });
});
