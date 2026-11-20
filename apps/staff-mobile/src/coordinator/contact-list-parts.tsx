import type { ContactAlertItemDto } from "@pilates/api-contracts";
import {
  Chevron,
  ClientFace,
  colors,
  ConfirmationSheet,
  LineIcon,
  NoticeRow,
  radii,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Path } from "react-native-svg";

import { CardLabel } from "../ui/card-pieces";
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
        accessibilityLabel={`${item.name}. ${reasons}. ${contactRowMeta(item)}`}
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
          <Text variant="titulo-fila">{item.name}</Text>
          <Text variant="secundario">{reasons}</Text>
          <Text variant="secundario">{contactRowMeta(item)}</Text>
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
            <LineIcon color={colors.text} size={18} strokeWidth={1.6}>
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
      <Text variant="secundario">{contactSheetMeta(item)}</Text>
      <View style={styles.inset}>
        <CardLabel>Por qué está aquí</CardLabel>
        {contactReasonLabels(item.reasons).map((label) => (
          <View key={label} style={styles.reasonLine}>
            <View style={styles.dot} />
            <Text variant="cuerpo">{label}</Text>
          </View>
        ))}
      </View>
      {href === null ? <Text variant="cuerpo">{contactMissingPhoneNote(item.phone)}</Text> : null}
      {failed ? (
        <View accessibilityRole="alert">
          <NoticeRow message={`No pudimos marcar a ${item.name}. Inténtalo de nuevo.`} />
        </View>
      ) : null}
    </ConfirmationSheet>
  );
}

const styles = StyleSheet.create({
  chevron: { alignSelf: "stretch", justifyContent: "center", paddingRight: spacing.lg },
  dot: { backgroundColor: colors.text, borderRadius: 3, height: 5, width: 5 },
  // Boards K02–K03: why she is here, a soft 50 inset with its 200 rule.
  inset: {
    ...surfaces.soft,
    borderRadius: radii.inset,
    gap: spacing.smd,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  reasonLine: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  // Board K01: the WhatsApp ring, white with a 1.5 pt 400 outline.
  ring: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    borderWidth: 1.5,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  row: { alignItems: "center", flexDirection: "row", minHeight: 72 },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingVertical: spacing.md,
  },
  whatsApp: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
});
