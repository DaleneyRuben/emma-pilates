import { Image, StyleSheet, View } from "react-native";

import { initials } from "../account/initials";
import { Text } from "../ui/text";
import { colors } from "../ui/tokens";

/** From this diameter the initials are `destacado`; below it `pastilla`. */
const largeDisc = 44;

/**
 * FIX-041 (follow-ups 240–242): a person's circle, her photo centre-cropped
 * by it, or while she has none her two initials in bold Crema on Palo de rosa
 * (ListaC, FIX-089).
 */
export function PersonAvatar({
  name,
  photoUri,
  size,
}: {
  name: string;
  photoUri: string | null;
  size: number;
  /** Kept for callers; palette B draws every circle the same (FIX-089). */
  tone?: "brand" | "neutral";
}) {
  const frame = { borderRadius: size / 2, height: size, width: size };
  if (photoUri !== null) {
    return (
      <Image
        accessibilityLabel={`Foto de ${name}`}
        resizeMode="cover"
        source={{ uri: photoUri }}
        style={[styles.photo, frame]}
      />
    );
  }
  return (
    <View style={[styles.initials, frame]}>
      {/* A fixed disc: the initials never scale out of it (follow-up 285). */}
      <Text
        allowFontScaling={false}
        tone="onDark"
        variant={size >= largeDisc ? "destacado" : "pastilla"}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    alignItems: "center",
    backgroundColor: colors.emphasis,
    justifyContent: "center",
  },
  photo: { backgroundColor: colors.emphasis },
});
