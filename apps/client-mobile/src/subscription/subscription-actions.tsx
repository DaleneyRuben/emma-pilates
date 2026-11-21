import {
  Chevron,
  colors,
  Glyph,
  type GlyphName,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export type PlanNotice = { icon: GlyphName; text: string; note?: string };

/**
 * Finding 54 (follow-up 259 A, Rosa Emma C12n): Mi plan's notices as one
 * white card, an icon on a 50 disc each, so the plan card stays the one focus.
 */
export function NoticeList({ notices }: { notices: readonly PlanNotice[] }) {
  return (
    <View style={styles.notices} testID="subscription-notices">
      {notices.map((notice, index) => (
        <View key={notice.text} style={[styles.notice, index > 0 && styles.noticeRule]}>
          <IconDisc icon={notice.icon} />
          <View style={styles.noticeBody}>
            <Text variant="titulo-fila">{notice.text}</Text>
            {notice.note === undefined ? null : <Text variant="secundario">{notice.note}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

function IconDisc({ icon }: { icon: GlyphName }) {
  return (
    <View style={styles.disc}>
      <Glyph color={colors.text} name={icon} size={18} strokeWidth={1.7} />
    </View>
  );
}

/** «Tu plan»: renewing and freezing as rows of a white card. */
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
      <IconDisc icon={icon} />
      <View style={styles.rowBody}>
        <Text variant="titulo-fila">{label}</Text>
        <Text variant="secundario">{note}</Text>
      </View>
      {onPress === undefined ? null : <Chevron size={18} strokeWidth={1.7} tone="muted" />}
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
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  notice: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  noticeBody: { flex: 1, gap: spacing.xxs },
  noticeRule: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  notices: { ...surfaces.card },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
});
