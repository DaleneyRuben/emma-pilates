import type { PropsWithChildren } from "react";
import { Modal, StyleSheet, View } from "react-native";

import { Glyph, type GlyphName } from "./glyph";
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
  /** «destructive» fills the action in Error (follow-up 226); «primary» in Palo de rosa (S24);
   * «destructivo» in Destructivo, for «Cerrar sesión» (follow-up 292). */
  tone?: "destructive" | "destructivo" | "primary";
  /** An outlined second action under the main one (S28's «Marcar contactada»). */
  secondaryAction?: { label: string; onPress: () => void; busy?: boolean };
  testID?: string;
  /** A 52 pt disc above a centred title and note (C01b8's gift). */
  icon?: GlyphName;
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
  icon,
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
          {icon === undefined ? (
            <>
              <SheetTitle>{title}</SheetTitle>
              {children}
              {note === undefined ? null : <Text variant="cuerpo">{note}</Text>}
            </>
          ) : (
            <View style={styles.hero}>
              <View style={styles.disc} testID="confirmation-sheet-disc">
                <Glyph color={colors.text} name={icon} size={26} strokeWidth={1.7} />
              </View>
              <SheetTitle style={styles.centred}>{title}</SheetTitle>
              {children}
              {note === undefined ? null : (
                <Text style={styles.centred} variant="cuerpo">
                  {note}
                </Text>
              )}
            </View>
          )}
          <PrimaryButton
            busy={busy}
            disabled={locked && !busy}
            label={confirmLabel}
            onPress={onConfirm}
            testID={confirmTestID}
            tone={tone === "destructive" ? "error" : tone}
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
  centred: { textAlign: "center" },
  disc: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: colors.band,
    borderRadius: 3,
    height: 5,
    width: 40,
  },
  hero: { alignItems: "center", gap: spacing.smLg },
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
