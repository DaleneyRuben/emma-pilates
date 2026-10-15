import { Modal, StyleSheet, Text, View } from "react-native";

import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing, typography } from "../ui/tokens";

// ADR-0067: the project's own explanation; only its yes opens the system
// prompt. Design follow-up 91 refines the sheet.
export function PushPermissionSheet({
  onAccept,
  onDecline,
  reason,
  visible,
}: {
  onAccept: () => void;
  onDecline: () => void;
  reason: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onDecline} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>¿Te avisamos?</Text>
          <BodyText>{reason}</BodyText>
          <PrimaryButton label="Activar notificaciones" onPress={onAccept} />
          <TextButton label="Ahora no" onPress={onDecline} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(74,58,48,0.22)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSecondary,
  },
});
