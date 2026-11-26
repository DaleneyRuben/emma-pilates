import { Text } from "@pilates/mobile-core";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { bodyScroll, FooterPanel } from "./card-pieces";
import { TabFooter } from "./tab-footer";

// The app's tsconfig carries no Node types: the little of `fs` this reads.
type Fs = {
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding: "utf8") => string;
  statSync: (path: string) => { isDirectory: () => boolean };
};
declare const __dirname: string;
const { readdirSync, readFileSync, statSync } = jest.requireActual<Fs>("fs");

// Every hand-written Staff source file but the specs.
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
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
        <Text variant="boton">Guardar</Text>
      </FooterPanel>,
    );
    expect(StyleSheet.flatten(task.getByTestId("panel").props.style)).toMatchObject({
      marginHorizontal: -16,
    });
    const tab = await render(
      <TabFooter testID="tab-panel">
        <Text variant="boton">Guardar</Text>
      </TabFooter>,
    );
    expect(StyleSheet.flatten(tab.getByTestId("tab-panel").props.style)).toMatchObject({
      marginHorizontal: -16,
    });
  });

  it("pads no Staff screen with the old 20 pt side margin", () => {
    const offenders = sources(`${__dirname}/..`).filter((path) => {
      const text = readFileSync(path, "utf8");
      return (
        /\bscreen: \{[^}]*paddingHorizontal: spacing\.xlSm/.test(text) ||
        /marginHorizontal: -spacing\.xlSm/.test(text)
      );
    });
    expect(offenders).toEqual([]);
  });
});
