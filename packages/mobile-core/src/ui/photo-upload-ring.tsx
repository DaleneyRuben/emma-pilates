import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "./tokens";

const ringWidth = 3;
const ringGap = 6;

/**
 * C22c (walkthrough n.º 14): a new profile photo shows at once inside this
 * ring while it uploads in the background, 200 with half of it in 600.
 */
export function PhotoUploadRing({
  children,
  size,
  uploading,
}: PropsWithChildren<{ size: number; uploading: boolean }>) {
  const outer = size + ringGap * 2;
  return (
    <View style={{ height: size, width: size }}>
      {children}
      {uploading ? (
        <View
          accessibilityLabel="Subiendo foto"
          pointerEvents="none"
          style={[
            styles.ring,
            { borderRadius: outer / 2, height: outer, left: -ringGap, top: -ringGap, width: outer },
          ]}
          testID="photo-upload-ring"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderColor: colors.band,
    borderRightColor: colors.text,
    borderTopColor: colors.text,
    borderWidth: ringWidth,
    position: "absolute",
  },
});
