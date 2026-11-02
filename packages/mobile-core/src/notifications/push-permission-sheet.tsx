import { Modal, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { Glyph } from "../ui/glyph";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing, typography } from "../ui/tokens";

// ADR-0067: the project's own explanation; only its yes opens the system
// prompt. Design follow-up 91 refines the sheet; the client v2 board «CP»
// (follow-up 227) draws it centred on Marfil with the bell disc. Each app
// passes its own title and text (walkthrough n.º 16).
export function PushPermissionSheet({
  onAccept,
  onDecline,
  reason,
  title = "¿Te avisamos?",
  visible,
}: {
  onAccept: () => void;
  onDecline: () => void;
  reason: string;
  title?: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onDecline} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="push-permission-sheet">
          <View style={styles.handle} />
          <View style={styles.disc} testID="push-permission-disc">
            <Glyph color={colors.emphasis} name="bell" size={32} strokeWidth={1.5} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.reason}>{reason}</Text>
          <View style={styles.actions}>
            <PrimaryButton
              label="Activar notificaciones"
              onPress={onAccept}
              testID="push-permission-accept"
            />
          </View>
          <TextButton label="Ahora no" onPress={onDecline} testID="push-permission-decline" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: { alignSelf: "stretch", marginTop: spacing.md },
  backdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: "flex-end",
  },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 72,
    justifyContent: "center",
    marginTop: spacing.md,
    width: 72,
  },
  handle: { backgroundColor: colors.hairline, borderRadius: radii.pill, height: 4, width: 36 },
  reason: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  sheet: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 24,
    textAlign: "center",
  },
});
