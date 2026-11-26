import type { AdminFeedbackDto } from "@pilates/api-contracts";
import { AvatarCircle, colors, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { appWords, commentTime, typeWords } from "./comment-words";

function CommentCard({
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
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <AvatarCircle name={comment.senderName} size={36} />
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <Text style={styles.name} variant="titulo-fila">
            {comment.senderName}
          </Text>
          <Text variant="secundario">{time}</Text>
        </View>
        <Text variant="secundario">{kind}</Text>
        <Text numberOfLines={3} variant="cuerpo">
          {comment.text}
        </Text>
      </View>
    </Pressable>
  );
}

/** E-F18: one tab's comments, each opening E-F19. */
export function CommentsList({
  comments,
  now,
  onOpen,
}: {
  comments: AdminFeedbackDto[];
  now: Date;
  onOpen: (comment: AdminFeedbackDto) => void;
}) {
  return comments.map((comment) => (
    <CommentCard comment={comment} key={comment.id} now={now} onOpen={() => onOpen(comment)} />
  ));
}

/** E-F18 «Filtrar», with the count of filters on once there are any. */
export function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  const label = count === 0 ? "Filtrar" : `Filtrar · ${count}`;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.filter, count > 0 && styles.filterOn]}
    >
      <Text tone={count > 0 ? "onDark" : "ink"} variant="boton-chico">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardBody: { flex: 1, gap: 3, minWidth: 0 },
  cardHead: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  filter: {
    borderColor: colors.primary,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  filterOn: { backgroundColor: colors.primary },
  name: { flex: 1 },
  pressed: { opacity: 0.7 },
});
