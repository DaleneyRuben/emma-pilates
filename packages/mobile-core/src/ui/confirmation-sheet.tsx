import type { PropsWithChildren } from "react";
import { Modal, StyleSheet, View } from "react-native";

import { OutlinedButton } from "./outlined-button";
import { PrimaryButton } from "./primary-button";
import { SheetTitle } from "./sheet-title";
import { Text } from "./text";
import { TextButton } from "./text-button";
import { colors, radii, shadows, spacing } from "./tokens";

type ConfirmationSheetProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  /** The line under the title (and any children) that says what confirming does;
   * left out when the children already say it as rows (C05c). */
  note?: string;
  confirmLabel: string;
  confirmTestID?: string;
  onConfirm: () => void;
  /** «Volver» unless the frame draws «Cancelar» (S23, S24). */
  dismissLabel?: string;
  onDismiss: () => void;
  /** The confirming request is in flight: the button spins, nothing else reacts. */
  busy?: boolean;
  /** «destructive» fills the action in Error (follow-up 226); «primary» in Palo de rosa (S24). */
  tone?: "destructive" | "primary";
  /** An outlined second action under the main one (S28's «Marcar contactada»). */
  secondaryAction?: { label: string; onPress: () => void; busy?: boolean };
  testID?: string;
}>;

/**
 * The bottom confirmation sheet of the frames (05, 15, S14, S15, S17, S24):
 * a white sheet over the scrim with its `SheetTitle`, the lines that explain the
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
  secondaryAction,
  testID,
  title,
  tone = "destructive",
  visible,
}: ConfirmationSheetProps) {
  // Either action in flight locks the rest of the sheet, the way back included.
  const locked = busy || secondaryAction?.busy === true;
  const dismiss = () => {
    if (!locked) onDismiss();
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
          <View style={styles.grabber} />
          <SheetTitle>{title}</SheetTitle>
          {children}
          {note === undefined ? null : <Text variant="cuerpo">{note}</Text>}
          <PrimaryButton
            busy={busy}
            disabled={locked && !busy}
            label={confirmLabel}
            onPress={onConfirm}
            testID={confirmTestID}
            tone={tone === "primary" ? "primary" : "error"}
          />
          {secondaryAction === undefined ? null : (
            <OutlinedButton
              busy={secondaryAction.busy}
              disabled={busy}
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
            />
          )}
          <TextButton disabled={locked} label={dismissLabel} onPress={dismiss} />
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
  grabber: {
    alignSelf: "center",
    backgroundColor: colors.band,
    borderRadius: 3,
    height: 5,
    width: 40,
  },
  sheet: {
    ...shadows.sheet,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.band,
    borderTopRightRadius: radii.band,
    gap: spacing.mdLg,
    paddingBottom: spacing.xxl + spacing.xxs,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
  },
});
