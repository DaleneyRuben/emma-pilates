import { colors, initials, radii, typography } from "@pilates/mobile-core";
import { Image, StyleSheet, Text, View } from "react-native";

// The Perfil avatar (18, 22): the photo centre-cropped by the circle, or the
// initials on the tint when the Client has none (prompt 22, follow-up 60 §1).
export function ClientAvatar({
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
        accessibilityLabel="Foto de perfil"
        resizeMode="cover"
        source={{ uri: photoUri }}
        style={[styles.photo, frame]}
      />
    );
  }
  return (
    <View style={[styles.avatar, frame]}>
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.32) }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primaryOnTint,
    fontSize: typography.bodyLarge,
    fontWeight: "600",
  },
  photo: { backgroundColor: colors.primaryTint },
});
