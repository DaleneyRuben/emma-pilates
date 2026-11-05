import { Image, StyleSheet, Text, View } from "react-native";

import { initials } from "../account/initials";
import { fontFamilies } from "../ui/fonts";
import { colors } from "../ui/tokens";

/**
 * FIX-041 (follow-ups 240–242): a person's circle, her photo centre-cropped
 * by it, or her two initials in Lora on Rosa tinte while she has none.
 */
export function PersonAvatar({
  name,
  photoUri,
  size,
}: {
  name: string;
  photoUri: string | null;
  size: number;
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
      <Text
        allowFontScaling={false}
        style={[styles.initialsText, { fontSize: Math.max(9, Math.round(size * 0.36)) }]}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    justifyContent: "center",
  },
  initialsText: { color: colors.primaryOnTint, fontFamily: fontFamilies.display },
  photo: { backgroundColor: colors.primaryTint },
});
