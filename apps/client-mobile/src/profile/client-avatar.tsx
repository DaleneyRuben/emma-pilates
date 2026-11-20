import { colors, fontFamilies, initials, radii } from "@pilates/mobile-core";
import { Image, StyleSheet, Text, View } from "react-native";

// The Perfil avatar (18, 22): the photo centre-cropped by the circle, or the
// initials when the Client has none (prompt 22, follow-up 60 §1): bold white
// on 600, or 600 on a white disc over the Perfil hero (C18, Rosa Emma).
export function ClientAvatar({
  name,
  onEmphasis = false,
  photoUri,
  size,
}: {
  name: string;
  /** Sits on the 600 hero, so the disc turns white. */
  onEmphasis?: boolean;
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
    <View style={[styles.avatar, onEmphasis && styles.avatarLight, frame]}>
      <Text
        style={[
          styles.avatarText,
          onEmphasis && styles.avatarTextLight,
          { fontSize: Math.round(size * 0.32) },
        ]}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.emphasis,
    borderRadius: radii.pill,
    justifyContent: "center",
  },
  avatarLight: { backgroundColor: colors.card },
  avatarText: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontWeight: "600",
  },
  avatarTextLight: { color: colors.text },
  photo: { backgroundColor: colors.emphasis },
});
