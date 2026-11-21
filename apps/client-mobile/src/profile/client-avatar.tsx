import { colors, initials, radii, Text } from "@pilates/mobile-core";
import { Image, StyleSheet, View } from "react-native";

// The Perfil avatar (18, 22): the photo centre-cropped by the circle, or the
// initials when the Client has none (prompt 22, follow-up 60 §1): white on
// 600, or 600 on a white disc over the Perfil hero (C18, Rosa Emma). The
// initials are `destacado` from 44 pt and `pastilla` below, and never grow
// with the phone's text size, which would overflow the disc (follow-up 285).
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
        allowFontScaling={false}
        tone={onEmphasis ? "ink" : "onDark"}
        variant={size >= 44 ? "destacado" : "pastilla"}
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
  photo: { backgroundColor: colors.emphasis },
});
