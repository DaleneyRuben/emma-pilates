import type { ContactAlertItemDto } from "@pilates/api-contracts";
import {
  Chevron,
  ClientFace,
  colors,
  ConfirmationSheet,
  fontFamilies,
  LineIcon,
  NoticeRow,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Path } from "react-native-svg";

import { useStaffFetcher } from "../staff-fetcher";
import {
  contactMissingPhoneNote,
  contactReasonLabels,
  contactReasonLine,
  contactRowMeta,
  contactSheetMeta,
  contactWhatsAppHref,
} from "./contact-list-copy";

const openWhatsApp = (href: string) => void Linking.openURL(href);

/**
 * Walkthrough finding 113 (proposal A): one quiet row per Client. Her name,
 * her reasons as words and her start; the only colour is the WhatsApp ring,
 * shown only when her phone can open it. The row opens her sheet.
 */
export function ContactRow({
  item,
  onOpen,
}: {
  item: ContactAlertItemDto;
  onOpen: (item: ContactAlertItemDto) => void;
}) {
  const fetcher = useStaffFetcher();
  const href = contactWhatsAppHref(item.phone);
  const reasons = contactReasonLine(item.reasons);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityHint="Abre el detalle"
        accessibilityLabel={`${item.name}. ${reasons}`}
        accessibilityRole="button"
        onPress={() => onOpen(item)}
        style={styles.rowMain}
        testID={`contact-row-${item.clientId}`}
      >
        <ClientFace
          fetcher={fetcher}
          name={item.name}
          photo={item.photo}
          size={40}
          tone="neutral"
        />
        <View style={styles.rowBody}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.reasons}>{reasons}</Text>
          <Text style={styles.meta}>{contactRowMeta(item)}</Text>
        </View>
      </Pressable>
      {href === null ? null : (
        <Pressable
          accessibilityLabel={`Abrir WhatsApp a ${item.name}`}
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={() => openWhatsApp(href)}
          style={styles.whatsApp}
        >
          <View style={styles.ring}>
            <LineIcon color={colors.primaryOnTint} size={18} strokeWidth={1.6}>
              <Path d="M4.5 5.5h15v10h-9l-4.5 4v-4h-1.5z" />
            </LineIcon>
          </View>
        </Pressable>
      )}
      <Pressable
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onPress={() => onOpen(item)}
        style={styles.chevron}
      >
        <Chevron tone="quiet" />
      </Pressable>
    </View>
  );
}

/**
 * Her sheet: why she is on the list, «Escribir por WhatsApp» (or why it
 * cannot open and «Abrir su ficha»), and «Marcar contactada».
 */
export function ContactSheet({
  failed,
  item,
  marking,
  onClose,
  onContacted,
  onOpenFile,
}: {
  failed: boolean;
  item: ContactAlertItemDto | null;
  marking: boolean;
  onClose: () => void;
  onContacted: (item: ContactAlertItemDto) => void;
  onOpenFile: (item: ContactAlertItemDto) => void;
}) {
  if (item === null) return null;
  const href = contactWhatsAppHref(item.phone);
  return (
    <ConfirmationSheet
      confirmLabel={href === null ? "Abrir su ficha" : "Escribir por WhatsApp"}
      onConfirm={() => (href === null ? onOpenFile(item) : openWhatsApp(href))}
      onDismiss={onClose}
      secondaryAction={{
        busy: marking,
        label: "Marcar contactada",
        onPress: () => onContacted(item),
      }}
      testID="contact-sheet"
      title={item.name}
      tone="primary"
      visible
    >
      <Text style={styles.meta}>{contactSheetMeta(item)}</Text>
      <View style={styles.inset}>
        <Text style={styles.insetTitle}>Por qué está aquí</Text>
        {contactReasonLabels(item.reasons).map((label) => (
          <View key={label} style={styles.reasonLine}>
            <View style={styles.dot} />
            <Text style={styles.reasons}>{label}</Text>
          </View>
        ))}
      </View>
      {href === null ? (
        <Text style={styles.note}>{contactMissingPhoneNote(item.phone)}</Text>
      ) : null}
      {failed ? (
        <View accessibilityRole="alert">
          <NoticeRow message={`No pudimos marcar a ${item.name}. Inténtalo de nuevo.`} />
        </View>
      ) : null}
    </ConfirmationSheet>
  );
}

const styles = StyleSheet.create({
  chevron: { alignSelf: "stretch", justifyContent: "center", paddingRight: spacing.smLg },
  dot: { backgroundColor: colors.iconQuiet, borderRadius: 3, height: 5, width: 5 },
  inset: {
    backgroundColor: colors.surface,
    borderRadius: radii.inset,
    gap: spacing.sm,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  insetTitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 11 * 0.12,
    textTransform: "uppercase",
  },
  meta: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  name: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 16 },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  reasonLine: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  reasons: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 19 },
  ring: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  row: { alignItems: "center", flexDirection: "row", minHeight: 72 },
  rowBody: { flex: 1, gap: 3 },
  rowMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingLeft: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  whatsApp: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
});
