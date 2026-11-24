import { Children, createContext, type ReactNode, useContext } from "react";
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";

import { colors, spacing } from "./tokens";

/** Width from which both apps switch to their tablet layouts, in either orientation. */
export const tabletMinimumWidth = 768;

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= tabletMinimumWidth;
}

/** The tablet's side margin and the header band's side padding (follow-up 289). */
export const tabletPageMargin = spacing.xxxl;

const WideScreensContext = createContext(false);

/**
 * Opts an app's screens into the tablet page (follow-up 289): 40 pt side
 * margins and the header band with its 36 pt title beside the back button.
 * The Client app wraps its navigation in it; without it every screen keeps
 * its phone frame at any width.
 */
export function WideScreens({ children }: { children: ReactNode }) {
  return <WideScreensContext.Provider value>{children}</WideScreensContext.Provider>;
}

/** True on a tablet inside `WideScreens`. */
export function useWideScreen(): boolean {
  const tablet = useIsTablet();
  return useContext(WideScreensContext) && tablet;
}

/** The centred column widths of the tablet boards (README «Client app on tablet»). */
export type TabletColumnWidth = 480 | 520 | 560 | 640 | 720;

/**
 * A single-purpose screen's centred column on a tablet page (`WideScreens`).
 * On a phone it adds nothing: its children stand in the parent as before.
 */
export function TabletColumn({
  children,
  gap,
  testID = "tablet-column",
  width,
}: {
  children: ReactNode;
  /** The column's own gap; the parent's otherwise stops at the column. */
  gap?: number;
  testID?: string;
  width: TabletColumnWidth;
}) {
  const tablet = useWideScreen();
  if (!tablet) return <>{children}</>;
  return (
    <View style={[styles.column, { gap, maxWidth: width }]} testID={testID}>
      {children}
    </View>
  );
}

/**
 * Two columns side by side on a tablet (16 pt apart, each its own stack):
 * equal halves, or a 300 pt column and the rest. On a phone the two stacks
 * follow each other in the parent, unchanged.
 */
export function TabletColumns({
  gap = spacing.lg,
  left,
  leftWidth,
  right,
  testID = "tablet-columns",
}: {
  gap?: number;
  left: ReactNode;
  leftWidth?: 300;
  right: ReactNode;
  testID?: string;
}) {
  const tablet = useWideScreen();
  if (!tablet) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }
  const leftStyle: ViewStyle = leftWidth === undefined ? styles.half : { width: leftWidth };
  return (
    <View style={[styles.columns, { gap }]} testID={testID}>
      <View style={[leftStyle, { gap }]} testID={`${testID}-left`}>
        {left}
      </View>
      <View style={[styles.half, { gap }]} testID={`${testID}-right`}>
        {right}
      </View>
    </View>
  );
}

/**
 * Repeated cards two to a row on a tablet, the last alone on the left; one
 * after another on a phone, unchanged.
 */
export function TabletGrid({
  children,
  gap = spacing.lg,
  testID = "tablet-grid",
}: {
  children: ReactNode;
  gap?: number;
  testID?: string;
}) {
  const tablet = useWideScreen();
  if (!tablet) return <>{children}</>;
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let index = 0; index < items.length; index += 2) rows.push(items.slice(index, index + 2));
  return (
    <View style={{ gap }} testID={testID}>
      {rows.map((row, index) => (
        <View key={index} style={[styles.row, { gap }]}>
          {row.map((item, cell) => (
            <View key={cell} style={styles.cell}>
              {item}
            </View>
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

/** The `S04` list panel's fixed width on a tablet. */
export const splitListWidth = 392;

/**
 * The tablet's list and detail (the Staff app's `S04`): a fixed 392 pt list
 * panel from the screen's edge, a rule, and the chosen item on the right.
 */
export function SplitPanels({
  detail,
  list,
  testID = "split-panels",
}: {
  detail: ReactNode;
  list: ReactNode;
  testID?: string;
}) {
  // A tablet page's 40 pt margins stop at the panels, which reach the edges.
  const wide = useWideScreen();
  return (
    <View style={[styles.split, wide && styles.splitWide]} testID={testID}>
      <View style={styles.list} testID={`${testID}-list`}>
        {list}
      </View>
      <View style={styles.detail} testID={`${testID}-detail`}>
        {detail}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, minWidth: 0 },
  column: { alignSelf: "center", width: "100%" },
  columns: { alignItems: "flex-start", flexDirection: "row" },
  detail: { flex: 1, minWidth: 0 },
  half: { flex: 1, minWidth: 0 },
  list: {
    borderRightColor: colors.borderSoft,
    borderRightWidth: 1,
    width: splitListWidth,
  },
  row: { alignItems: "stretch", flexDirection: "row" },
  split: { flex: 1, flexDirection: "row" },
  splitWide: { marginHorizontal: -tabletPageMargin },
});
