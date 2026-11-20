import { Modal, StyleSheet, View } from "react-native";

import { Glyph } from "../ui/glyph";
import { PrimaryButton } from "../ui/primary-button";
import { SheetTitle } from "../ui/sheet-title";
import { Text } from "../ui/text";
import { TextButton } from "../ui/text-button";
import { colors, radii, shadows, spacing } from "../ui/tokens";

// ADR-0067: the project's own explanation; only its yes opens the system
// prompt. Design follow-up 91 refines the sheet; the Rosa Emma boards «CP»
// and E-A11 draw it centred on the white sheet with the bell disc. Each app
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
            <Glyph color={colors.text} name="bell" size={32} strokeWidth={1.5} />
          </View>
          <SheetTitle style={styles.centered}>{title}</SheetTitle>
          <Text style={styles.reason} variant="cuerpo">
            {reason}
          </Text>
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
  centered: { textAlign: "center" },
  backdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: "flex-end",
  },
  // CP, E-A11: the bell on a 50 disc with its 1 pt 200 rule.
  disc: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    marginTop: spacing.md,
    width: 72,
  },
  handle: { backgroundColor: colors.band, borderRadius: radii.pill, height: 5, width: 40 },
  reason: {
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  sheet: {
    alignItems: "center",
    ...shadows.sheet,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.band,
    borderTopRightRadius: radii.band,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
  },
});
