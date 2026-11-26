import type { AdminFeedbackDto } from "@pilates/api-contracts";
import {
  AvatarCircle,
  Chevron,
  colors,
  Glyph,
  radii,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { appWords, commentTime, typeWords } from "./comment-words";

function CommentRow({
  comment,
  now,
  onOpen,
}: {
  comment: AdminFeedbackDto;
  now: Date;
  onOpen: () => void;
}) {
  const time = commentTime(comment.createdAt, now);
  const kind = `${typeWords[comment.type]} · ${appWords[comment.app]}`;
  return (
    <Pressable
      accessibilityLabel={`${comment.senderName}, ${time}. ${kind}. ${comment.text}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <AvatarCircle name={comment.senderName} size={36} />
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={styles.name} variant="titulo-fila">
            {comment.senderName}
          </Text>
          <Text variant="secundario">{time}</Text>
        </View>
        <Text variant="secundario">{kind}</Text>
        <Text numberOfLines={2} variant="cuerpo">
          {comment.text}
        </Text>
      </View>
      <Chevron size={18} strokeWidth={1.7} />
    </Pressable>
  );
}

/**
 * E-F18, E-F25, E-F26: one tab's comments as rows of one white card split by
 * hairlines, each opening E-F19.
 */
export function CommentsList({
  comments,
  now,
  onOpen,
}: {
  comments: AdminFeedbackDto[];
  now: Date;
  onOpen: (comment: AdminFeedbackDto) => void;
}) {
  return (
    <View style={styles.card} testID="comments-card">
      {comments.map((comment, index) => (
        <Fragment key={comment.id}>
          {index === 0 ? null : <View style={styles.hairline} testID="comments-hairline" />}
          <CommentRow comment={comment} now={now} onOpen={() => onOpen(comment)} />
        </Fragment>
      ))}
    </View>
  );
}

/** E-F18 «Filtrar» after its tag, with the count of filters on once there are any. */
export function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  const label = count === 0 ? "Filtrar" : `Filtrar · ${count}`;
  const on = count > 0;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.filter, on && styles.filterOn]}
    >
      <Glyph color={on ? colors.white : colors.text} name="tag" size={16} strokeWidth={1.7} />
      <Text tone={on ? "onDark" : "ink"} variant="boton-chico">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, overflow: "hidden" },
  filter: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.smd,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.mdLg,
  },
  filterOn: { backgroundColor: colors.primary },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  name: { flex: 1 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBody: { flex: 1, gap: 3, minWidth: 0 },
  rowHead: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
});
