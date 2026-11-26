import { render } from "@testing-library/react-native";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { StyleSheet, Text } from "react-native";

import { bodyScroll, FooterPanel } from "./card-pieces";
import { TabFooter } from "./tab-footer";

// Every hand-written Staff source file but the specs.
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.spec\.tsx?$/.test(name) ? [path] : [];
  });
}

// SYS-un-solo-margen: the band, section titles, cards and footer sit on one
// 16 pt left edge on every Staff screen.
describe("Staff screens on one 16 pt margin", () => {
  it("lays a scroll body's cards on the 16 pt edge", () => {
    expect(StyleSheet.flatten(bodyScroll.content)).toMatchObject({ paddingHorizontal: 16 });
    expect(StyleSheet.flatten(bodyScroll.scroll)).toMatchObject({ marginHorizontal: -16 });
    expect(StyleSheet.flatten(bodyScroll.clip)).toMatchObject({ marginHorizontal: -16 });
  });

  it("reaches a footer panel past the 16 pt screen padding", async () => {
    const task = await render(
      <FooterPanel testID="panel">
        <Text>Guardar</Text>
      </FooterPanel>,
    );
    expect(StyleSheet.flatten(task.getByTestId("panel").props.style)).toMatchObject({
      marginHorizontal: -16,
    });
    const tab = await render(
      <TabFooter testID="tab-panel">
        <Text>Guardar</Text>
      </TabFooter>,
    );
    expect(StyleSheet.flatten(tab.getByTestId("tab-panel").props.style)).toMatchObject({
      marginHorizontal: -16,
    });
  });

  it("pads no Staff screen with the old 20 pt side margin", () => {
    const offenders = sources(join(__dirname, "..")).filter((path) => {
      const text = readFileSync(path, "utf8");
      return (
        /\bscreen: \{[^}]*paddingHorizontal: spacing\.xlSm/.test(text) ||
        /marginHorizontal: -spacing\.xlSm/.test(text)
      );
    });
    expect(offenders).toEqual([]);
  });
});
