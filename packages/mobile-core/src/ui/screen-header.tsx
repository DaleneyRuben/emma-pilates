import { type ReactNode, useContext, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Polyline } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { ScreenFrameContext } from "./screen";
import { tabletPageMargin, useWideScreen } from "./tablet-layout";
import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

type Bleed = { left: number; top: number };

/**
 * How far the band reaches past its natural place to meet the screen's top
 * and side edges. It starts from the screen's padding and safe area, then
 * measures itself against the screen, which also covers a scroll view's own
 * padding. The top only ever grows: the safe area lands a frame after the
 * first layout, and a later layout may come mid-scroll.
 */
function useBandBleed() {
  const frame = useContext(ScreenFrameContext);
  const band = useRef<View>(null);
  const [measured, setMeasured] = useState<Bleed>({ left: 0, top: 0 });
  const bleed: Bleed = {
    left: Math.max(frame?.left ?? 0, measured.left),
    top: Math.max(frame?.top ?? 0, measured.top),
  };

  const onLayout = () => {
    const screen = frame?.ref.current;
    if (!screen || !band.current) return;
    band.current.measureLayout(
      screen,
      (x, y) => {
        // Where the band would sit without its bleed, as measured now.
        const naturalLeft = x + bleed.left;
        const naturalTop = y + bleed.top;
        setMeasured((current) => {
          const left = Math.abs(naturalLeft - current.left) < 0.5 ? current.left : naturalLeft;
          const top = naturalTop > current.top + 0.5 ? naturalTop : current.top;
          return left === current.left && top === current.top ? current : { left, top };
        });
      },
      () => undefined,
    );
  };

  return { band, bleed: frame === null ? null : bleed, onLayout };
}

/**
 * Every screen's header in both apps (Rosa Emma): a 200 band that reaches the
 * screen's top and side edges with rounded lower corners, the back button as a
 * white circle on its own row, then the screen's own large Lora title — never
 * the name of the screen it was opened from. A tab's root screen omits
 * `onBack`. Small text never sits on 200: the eyebrow and the subtitle ride on
 * white capsules. Title `titulo-pagina`, eyebrow `etiqueta`, subtitle
 * `compacto` (follow-up 285).
 */
export function ScreenHeader({
  action,
  children,
  eyebrow,
  onBack,
  subtitle,
  testID = "screen-header",
  title,
  titleAccessory,
  titleLabel,
}: {
  /** A control at the end of the back button's row, such as «Marcar leídas». */
  action?: ReactNode;
  /** More of the band under the title: a branch picker, tabs, a day strip. */
  children?: ReactNode;
  /** An uppercase capsule above the title, such as «Instructora · Jueves 19». */
  eyebrow?: string;
  /** @deprecated The band always reaches the screen's edges. */
  fullBleed?: boolean;
  /** @deprecated The band always pads itself. */
  inset?: boolean;
  onBack?: () => void;
  /** One line under the title, on a white capsule. */
  subtitle?: string;
  testID?: string;
  /** Omitted only when the screen draws its own large title right below. */
  title?: string;
  /** Sits at the end of the title's line, such as the notification bell. */
  titleAccessory?: ReactNode;
  /** What a screen reader says for the title, when it differs from it. */
  titleLabel?: string;
}) {
  const { band, bleed, onLayout } = useBandBleed();
  // Follow-up 289: on a tablet the back button and the action share the
  // title's row, and the title is 36 pt.
  const wide = useWideScreen();
  const showRow =
    !wide && (onBack !== undefined || (action !== undefined && eyebrow === undefined));
  const backButton =
    onBack === undefined ? null : (
      <Pressable
        accessibilityLabel="Volver"
        accessibilityRole="button"
        hitSlop={spacing.xs}
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        testID="back-bar"
      >
        <LineIcon color={colors.text} size={22} strokeWidth={1.7}>
          <Polyline points="15,5 8,12 15,19" />
        </LineIcon>
      </Pressable>
    );
  const actionInTitle = wide && action !== undefined && eyebrow === undefined;
  return (
    <View
      onLayout={onLayout}
      ref={band}
      style={[
        styles.band,
        wide && styles.wideBand,
        bleed !== null && {
          marginHorizontal: -bleed.left,
          marginTop: -bleed.top,
          paddingTop: Math.max(bleed.top, spacing.lg),
        },
      ]}
      testID={testID}
    >
      {showRow ? (
        <View style={styles.row}>
          {backButton}
          {action === undefined ? null : <View style={styles.action}>{action}</View>}
        </View>
      ) : null}
      {eyebrow === undefined ? null : (
        <View style={styles.eyebrowRow}>
          <View style={styles.capsule}>
            <Text variant="etiqueta">{eyebrow}</Text>
          </View>
          {action !== undefined && !showRow ? <View style={styles.action}>{action}</View> : null}
        </View>
      )}
      {title === undefined && titleAccessory === undefined && !(wide && onBack) ? null : (
        <View style={[styles.titleRow, wide && styles.wideTitleRow]}>
          {wide ? backButton : null}
          {title === undefined ? null : (
            <Text
              accessibilityLabel={titleLabel ?? title}
              accessibilityRole="header"
              style={styles.title}
              variant={wide ? "titulo-pagina-tablet" : "titulo-pagina"}
            >
              {title}
            </Text>
          )}
          {titleAccessory}
          {actionInTitle ? <View style={styles.action}>{action}</View> : null}
        </View>
      )}
      {subtitle === undefined ? null : (
        <View style={styles.subtitleBox}>
          <Text variant="compacto">{subtitle}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { flexShrink: 0, marginLeft: "auto" },
  back: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  band: {
    backgroundColor: colors.band,
    borderBottomLeftRadius: radii.band,
    borderBottomRightRadius: radii.band,
    gap: spacing.md,
    marginBottom: spacing.xs,
    paddingBottom: spacing.xlLg - spacing.xs,
    paddingHorizontal: spacing.xlSm,
  },
  capsule: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 26,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  eyebrowRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  pressed: { opacity: 0.6 },
  row: { alignItems: "center", flexDirection: "row", minHeight: 44 },
  subtitleBox: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  title: { flex: 1 },
  titleRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  wideBand: { paddingBottom: spacing.xl, paddingHorizontal: tabletPageMargin },
  wideTitleRow: { gap: spacing.lg },
});
