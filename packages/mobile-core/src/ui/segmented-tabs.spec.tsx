import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { SegmentedTabs } from "./segmented-tabs";

const options = [
  { key: "upcoming", label: "Próximas" },
  { key: "history", label: "Historial" },
] as const;

// Follow-up 225 §9; FIX-089 (palette B): the selected segment is Rosa profundo
// with a Crema label, the others bare on a Crema track with an Arcilla border.
describe("SegmentedTabs", () => {
  it("draws a Crema track at padding 4 and radius 14 with an Arcilla border", async () => {
    const screen = await render(
      <SegmentedTabs
        accessibilityLabel="Reservas"
        onSelect={jest.fn()}
        options={options}
        selected="upcoming"
        testID="tabs"
      />,
    );

    expect(screen.getByTestId("tabs")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 16,
      flexDirection: "row",
      gap: 4,
      padding: 4,
    });
    expect(screen.getByTestId("tabs")).toHaveProp("accessibilityRole", "tablist");
  });

  it("fills the selected 44 pt segment in Rosa profundo and leaves the other bare", async () => {
    const screen = await render(
      <SegmentedTabs onSelect={jest.fn()} options={options} selected="upcoming" />,
    );

    const selected = screen.getByRole("tab", { name: "Próximas" });
    expect(selected).toHaveProp("accessibilityState", { selected: true });
    expect(selected).toHaveStyle({
      backgroundColor: "#93615D",
      borderRadius: 12,
      flex: 1,
      height: 44,
    });
    const other = screen.getByRole("tab", { name: "Historial" });
    expect(other).toHaveProp("accessibilityState", { selected: false });
    expect(StyleSheet.flatten(other.props.style)).not.toHaveProperty("backgroundColor");
    expect(screen.getByText("Próximas")).toHaveStyle({
      color: "#FFFBFB",
      fontFamily: "WorkSans_700Bold",
      fontSize: 15,
    });
    expect(screen.getByText("Historial")).toHaveStyle({
      color: "#93615D",
      fontFamily: "WorkSans_500Medium",
      fontSize: 15,
    });
  });

  it("reports the segment pressed", async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <SegmentedTabs onSelect={onSelect} options={options} selected="upcoming" />,
    );

    await fireEvent.press(screen.getByRole("tab", { name: "Historial" }));
    expect(onSelect).toHaveBeenCalledWith("history");
  });

  // S10 (FIX-028): once one way of paying is sent, the other cannot be chosen.
  it("keeps a disabled segment from being chosen and says so", async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <SegmentedTabs
        onSelect={onSelect}
        options={[options[0], { ...options[1], disabled: true }]}
        selected="upcoming"
      />,
    );

    const off = screen.getByRole("tab", { name: "Historial" });
    expect(off).toHaveProp("accessibilityState", { disabled: true, selected: false });
    await fireEvent.press(off);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText("Historial")).toHaveStyle({ color: "#93615D" });
  });
});
