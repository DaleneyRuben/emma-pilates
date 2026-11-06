import { Chevron, colors, fontFamilies, radii, spacing, surfaces } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type PillTone = "neutral" | "tint";

/** A v2 status pill: Rosa tinte with Rosa enlace, or Arena for a full or taken class. */
export function StatusPill({ label, tone = "tint" }: { label: string; tone?: PillTone }) {
  return (
    <View style={[styles.pill, tone === "neutral" && styles.neutral]}>
      <Text style={[styles.pillLabel, tone === "neutral" && styles.neutralLabel]}>{label}</Text>
    </View>
  );
}

/**
 * A class on a v2 list (S02, S07, S13, Horario): the start in Lora 20 on the
 * left (with the length under it on S02), the class and one quiet line, a
 * pill, and a chevron when the row opens something.
 */
export function SessionRow({
  accessibilityLabel,
  duration,
  onPress,
  pill,
  pillTone,
  subtitle,
  subtitleLead,
  testID,
  time,
  title,
}: {
  accessibilityLabel?: string;
  duration?: string;
  onPress?: () => void;
  pill?: string;
  pillTone?: PillTone;
  subtitle: string;
  /** The Trainer's 20 px face before the quiet line (FIX-041, follow-up 242). */
  subtitleLead?: ReactNode;
  testID?: string;
  time: string;
  title: string;
}) {
  const content = (
    <>
      <View style={styles.timeColumn}>
        <Text numberOfLines={1} style={styles.time}>
          {time}
        </Text>
        {duration === undefined ? null : <Text style={styles.quiet}>{duration}</Text>}
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitleLead === undefined ? (
          <Text style={styles.quiet}>{subtitle}</Text>
        ) : (
          <View style={styles.leadLine}>
            {subtitleLead}
            <Text style={[styles.quiet, styles.leadText]}>{subtitle}</Text>
          </View>
        )}
      </View>
      {pill === undefined ? null : <StatusPill label={pill} tone={pillTone} />}
      {onPress === undefined ? null : <Chevron size={16} strokeWidth={1.5} tone="muted" />}
    </>
  );
  const label = accessibilityLabel ?? [time, title, subtitle, pill].filter(Boolean).join(", ");
  if (onPress === undefined) {
    return (
      <View accessibilityLabel={label} accessible style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  leadLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  leadText: { flexShrink: 1 },
  neutral: { backgroundColor: colors.hairline },
  neutralLabel: { color: colors.text },
  pill: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  pillLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
  quiet: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  row: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  // «07:00» in Lora 20 runs wider than 56 pt on both platforms (more so on
  // Android): a fixed width wrapped it, so 56 is only the floor.
  timeColumn: { flexShrink: 0, minWidth: 56 },
  title: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 16 },
});
