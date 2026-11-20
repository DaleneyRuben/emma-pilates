import {
  type ClientContactDto,
  getGetAssistantClientOverviewQueryKey,
  useMarkClientContacted,
  formatListDate,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  fontFamilies,
  NoticeRow,
  PrimaryButton,
  spacing,
  surfaces,
  TextButton,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { CardLabel } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { OutlineButton } from "../ui/outline-button";
import { contactWhatsAppHref } from "./contact-list-copy";

/** «tel:+59170011001», the WhatsApp link's digits (FIX-037 keeps her own code). */
export const callHref = (whatsApp: string): string =>
  `tel:+${whatsApp.replace("https://wa.me/", "")}`;

/** Why the ficha has no WhatsApp or Llamar for her. */
export const unreachableNote = (phone: string | null): string => {
  const what =
    phone === null || phone.trim() === ""
      ? "No tiene teléfono registrado"
      : `Su celular está incompleto (${phone.trim()})`;
  return `${what}, así que no se puede escribirle ni llamarla. Háblale en el estudio.`;
};

/** «La contactaste el jue 12 nov. Está en Para contactar.» */
export const lastContactLine = (contact: ClientContactDto): string => {
  const last =
    contact.lastContactedAt === null
      ? "Todavía no hay contactos anotados."
      : `${contact.lastContactedByYou ? "La contactaste" : "Contactada"} el ${formatListDate(
          boliviaCivilDate(new Date(contact.lastContactedAt)),
        )}.`;
  return contact.onContactList ? `${last} Está en Para contactar.` : last;
};

const open = (href: string) => void Linking.openURL(href);

/**
 * Staff pick E4 A, the Coordinator's top of the ficha: «Escribir por
 * WhatsApp» and «Llamar», then her last contact with «Anotar contacto» while
 * she is on Para contactar (BKM-013).
 */
export function ClientContactPanel({
  clientId,
  contact,
  phone,
}: {
  clientId: string;
  contact: ClientContactDto | undefined;
  phone: string | null;
}) {
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const mark = useMarkClientContacted({ fetcher });
  const [failed, setFailed] = useState(false);
  const whatsApp = contactWhatsAppHref(phone);

  const onMark = () => {
    setFailed(false);
    mark.mutate(
      { clientId },
      {
        onSuccess: (response) => {
          // The generated client resolves every status; only 204 marked her.
          if (response.status !== 204) setFailed(true);
          void queryClient.invalidateQueries({
            queryKey: getGetAssistantClientOverviewQueryKey(clientId),
          });
        },
        onError: () => setFailed(true),
      },
    );
  };

  return (
    <>
      {whatsApp === null ? (
        // Small text never sits on the 100 screen: the note rides a white card.
        <View style={styles.card}>
          <Text style={styles.note}>{unreachableNote(phone)}</Text>
        </View>
      ) : (
        <View style={styles.pair} testID="client-overview-actions">
          <View style={styles.wide}>
            <PrimaryButton
              label="Escribir por WhatsApp"
              onPress={() => open(whatsApp)}
              testID="client-overview-whatsapp"
            />
          </View>
          <OutlineButton
            label="Llamar"
            onPress={() => open(callHref(whatsApp))}
            testID="client-overview-call"
          />
        </View>
      )}
      {contact === undefined ? null : (
        <View style={styles.card} testID="client-last-contact">
          <CardLabel>Último contacto</CardLabel>
          <Text style={styles.line}>{lastContactLine(contact)}</Text>
          {failed ? (
            <View accessibilityRole="alert">
              <NoticeRow message="No pudimos anotar el contacto. Inténtalo de nuevo." />
            </View>
          ) : null}
          {contact.onContactList ? (
            <TextButton
              disabled={mark.isPending}
              label="Anotar contacto"
              onPress={onMark}
              style={styles.link}
              testID="client-overview-note-contact"
            />
          ) : null}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.sm, padding: spacing.lg },
  line: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  link: { alignSelf: "flex-start", paddingHorizontal: 0 },
  note: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  pair: { flexDirection: "row", gap: spacing.md },
  wide: { flex: 1 },
});
