import type { PropsWithChildren } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { BodyText } from "./body-text";
import { fontFamilies } from "./fonts";
import { OutlinedButton } from "./outlined-button";
import { PrimaryButton } from "./primary-button";
import { TextButton } from "./text-button";
import { colors, radii, spacing, typography } from "./tokens";

type ConfirmationSheetProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  /** The line under the title (and any children) that says what confirming does. */
  note: string;
  confirmLabel: string;
  confirmTestID?: string;
  onConfirm: () => void;
  /** «Volver» unless the frame draws «Cancelar» (S23, S24). */
  dismissLabel?: string;
  onDismiss: () => void;
  /** The confirming request is in flight: the button spins, nothing else reacts. */
  busy?: boolean;
  /** «destructive» outlines the action in Error; «primary» fills it (S24). */
  tone?: "destructive" | "primary";
  testID?: string;
}>;

/**
 * The bottom confirmation sheet of the frames (05, 15, S14, S15, S17, S24):
 * a white sheet over the scrim with a Lora title, the lines that explain the
 * consequence, the action, and a quiet link back (UX-002).
 */
export function ConfirmationSheet({
  busy = false,
  children,
  confirmLabel,
  confirmTestID,
  dismissLabel = "Volver",
  note,
  onConfirm,
  onDismiss,
  testID,
  title,
  tone = "destructive",
  visible,
}: ConfirmationSheetProps) {
  const dismiss = () => {
    if (!busy) onDismiss();
  };
  return (
    <Modal
      animationType="slide"
      onRequestClose={dismiss}
      testID={testID === undefined ? undefined : `${testID}-modal`}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID={testID}>
          <Text style={styles.title}>{title}</Text>
          {children}
          <BodyText>{note}</BodyText>
          {tone === "primary" ? (
            <PrimaryButton
              busy={busy}
              label={confirmLabel}
              onPress={onConfirm}
              size="compact"
              testID={confirmTestID}
            />
          ) : (
            <OutlinedButton
              busy={busy}
              label={confirmLabel}
              onPress={onConfirm}
              testID={confirmTestID}
              tone="error"
            />
          )}
          <TextButton disabled={busy} label={dismissLabel} onPress={dismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.scrim,
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
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
});
