import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { SegmentedTabs } from "./segmented-tabs";

const options = [
  { key: "upcoming", label: "Próximas" },
  { key: "history", label: "Historial" },
] as const;

// Follow-up 225 §9 as the staff canvas draws it (S21, S22): one emphasis per
// screen, so the selected segment is Rosa tinte with a Palo de rosa ring.
describe("SegmentedTabs", () => {
  it("draws a Lino track at padding 4 and radius 14", async () => {
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
      backgroundColor: "#F5EFE9",
      borderRadius: 14,
      flexDirection: "row",
      gap: 4,
      padding: 4,
    });
    expect(screen.getByTestId("tabs")).toHaveProp("accessibilityRole", "tablist");
  });

  it("rings the selected 40 pt segment and leaves the other bare, both Rosa enlace", async () => {
    const screen = await render(
      <SegmentedTabs onSelect={jest.fn()} options={options} selected="upcoming" />,
    );

    const selected = screen.getByRole("tab", { name: "Próximas" });
    expect(selected).toHaveProp("accessibilityState", { selected: true });
    expect(selected).toHaveStyle({
      backgroundColor: "#F2E4E1",
      borderColor: "#B78380",
      borderRadius: 10,
      borderWidth: 1.5,
      flex: 1,
      height: 40,
    });
    const other = screen.getByRole("tab", { name: "Historial" });
    expect(other).toHaveProp("accessibilityState", { selected: false });
    expect(StyleSheet.flatten(other.props.style)).not.toHaveProperty("backgroundColor");
    for (const label of ["Próximas", "Historial"]) {
      expect(screen.getByText(label)).toHaveStyle({
        color: "#7D4F4B",
        fontFamily: "WorkSans_600SemiBold",
        fontSize: 15,
      });
    }
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
    expect(screen.getByText("Historial")).toHaveStyle({ color: "#B3A9A5" });
  });
});
