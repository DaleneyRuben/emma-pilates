import { NavigationContext } from "@react-navigation/native";
import { useContext, useEffect, useEffectEvent } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { fontFamilies } from "./fonts";
import { Glyph } from "./glyph";
import { colors, spacing, typography } from "./tokens";

export type BrandToastProps = {
  /** One line under the title, such as «Te quedan 9 clases en tu plan». */
  note?: string;
  onClose: () => void;
  /** Overrides, such as a larger bottom inset on a screen without a tab bar. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
  title: string;
};

/**
 * The confirmation toast (follow-up 225 §7): Rosa profundo, radius 14, white
 * text and a check, a 44 pt × to close it. Render it as the last child of the
 * `Screen`: it floats 16 above the screen's bottom edge, which on a tab screen
 * is the tab bar. It never closes on its own; pair it with `useStickyNotice`.
 */
export function BrandToast({ note, onClose, style, testID, title }: BrandToastProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.toast, style]}
      testID={testID}
    >
      <Glyph color={colors.white} name="check" size={20} strokeWidth={1.8} />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
      </View>
      <Pressable
        accessibilityLabel="Cerrar aviso"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.close}
      >
        <Glyph color={colors.white} name="cross" size={16} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

/**
 * A notice that a navigation carried in its params («Reserva confirmada»,
 * «Pago aprobado»): the screen shows it while the param is set. Unlike
 * `useTransientNotice` it never times out; `dismiss` clears the param when the
 * screen loses focus, and the toast's × calls the same `dismiss`. Outside a
 * navigator (the unit specs) only the × closes it.
 */
export function useStickyNotice<T>(notice: T | undefined, dismiss: () => void): T | null {
  const navigation = useContext(NavigationContext);
  const clear = useEffectEvent(dismiss);
  const showing = notice !== undefined;

  useEffect(() => {
    if (navigation === undefined || !showing) return undefined;
    return navigation.addListener("blur", () => clear());
  }, [navigation, showing]);

  return notice ?? null;
}

const styles = StyleSheet.create({
  close: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  note: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
  },
  text: { flex: 1, gap: spacing.xxs },
  title: {
    color: colors.white,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  toast: {
    alignItems: "center",
    backgroundColor: colors.emphasis,
    borderRadius: 14,
    bottom: spacing.lg,
    elevation: 6,
    flexDirection: "row",
    gap: spacing.md,
    left: spacing.lg,
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingTop: spacing.md,
    position: "absolute",
    right: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
});
