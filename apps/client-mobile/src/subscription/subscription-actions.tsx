import {
  Chevron,
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type PlanNotice = { icon: GlyphName; text: string; note?: string };

/**
 * Finding 54 (follow-up 259 A): Mi plan's notices as one list without a
 * coloured fill, an icon each, so the plan card stays the one focus.
 */
export function NoticeList({ notices }: { notices: readonly PlanNotice[] }) {
  return (
    <View style={styles.notices} testID="subscription-notices">
      {notices.map((notice, index) => (
        <View key={notice.text} style={[styles.notice, index > 0 && styles.noticeRule]}>
          <Glyph color={colors.primary} name={notice.icon} size={20} strokeWidth={1.5} />
          <View style={styles.noticeBody}>
            <Text style={styles.noticeText}>{notice.text}</Text>
            {notice.note === undefined ? null : (
              <Text style={styles.noticeNote}>{notice.note}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/** «Tu plan»: renewing and freezing as Lino rows with a line under the label. */
export function ActionRows({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.group}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index === 0 ? null : <View style={styles.hairline} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** A row that opens something, or, without `onPress`, an off row saying why. */
export function ActionRow({
  icon,
  label,
  note,
  onPress,
}: {
  icon: GlyphName;
  label: string;
  note: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.disc}>
        <Glyph color={colors.primary} name={icon} size={18} strokeWidth={1.5} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, onPress === undefined && styles.rowLabelOff]}>{label}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
      {onPress === undefined ? null : <Chevron size={16} strokeWidth={1.5} tone="muted" />}
    </>
  );
  if (onPress === undefined) {
    return (
      <View accessibilityLabel={`${label}. ${note}`} accessible style={styles.row}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityHint={note}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 64 },
  notice: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  noticeBody: { flex: 1, gap: spacing.xxs },
  noticeNote: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
  },
  noticeRule: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  noticeText: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 21,
  },
  notices: {},
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowLabel: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: typography.body },
  rowLabelOff: { color: colors.textMuted },
  rowNote: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 18 },
});
