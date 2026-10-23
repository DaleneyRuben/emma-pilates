import {
  getListContactAlertsQueryKey,
  useListContactAlerts,
  useMarkClientContacted,
  type ContactAlertItemDto,
} from "@pilates/api-contracts";
import {
  AvatarCircle,
  BodyText,
  colors,
  EmptyState,
  LoadingState,
  OutlinedButton,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { useIsTablet } from "../ui/use-is-tablet";
import { contactAlertReasons, startedOnLabel, whatsAppHref } from "./contact-list-copy";

type Notice = { kind: "success" | "error"; name: string };

function ReasonLine({ reason }: { reason: ContactAlertItemDto["reasons"][number] }) {
  return (
    <View style={styles.reason}>
      <View style={styles.dot} />
      <Text style={styles.reasonText}>{contactAlertReasons[reason]}</Text>
    </View>
  );
}

function ContactCard({
  item,
  busy,
  onContacted,
}: {
  item: ContactAlertItemDto;
  busy: boolean;
  onContacted: (item: ContactAlertItemDto) => void;
}) {
  const href = item.phone === null ? null : whatsAppHref(item.phone);
  return (
    <View style={styles.card}>
      <View style={styles.identity}>
        <AvatarCircle fontSize={16} name={item.name} size={42} />
        <View style={styles.identityBody}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>{item.phone ?? "Sin teléfono"}</Text>
        </View>
      </View>
      {item.reasons.map((reason) => (
        <ReasonLine key={reason} reason={reason} />
      ))}
      <Text style={styles.started}>{startedOnLabel(item.startedOn)}</Text>
      <View style={styles.actions}>
        {href === null ? null : (
          <View style={styles.action}>
            <OutlinedButton
              label="Abrir WhatsApp"
              onPress={() => void Linking.openURL(href)}
            />
          </View>
        )}
        <View style={styles.action}>
          <PrimaryButton
            busy={busy}
            label="Contactada"
            onPress={() => onContacted(item)}
            size="compact"
          />
        </View>
      </View>
    </View>
  );
}

export function ContactListScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const list = useListContactAlerts({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const mark = useMarkClientContacted({ fetcher });
  const queryKeys = [getListContactAlertsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const [notice, setNotice] = useState<Notice | null>(null);
  const page = list.data?.status === 200 ? list.data.data : undefined;
  const items = page?.items ?? [];
  const markingId = mark.isPending ? mark.variables?.clientId : undefined;

  const onContacted = (item: ContactAlertItemDto) => {
    mark.mutate(
      { clientId: item.clientId },
      {
        onSuccess: () => {
          void list.refetch();
          setNotice({ kind: "success", name: item.name });
        },
        onError: () => setNotice({ kind: "error", name: item.name }),
      },
    );
  };

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar onBack={() => navigation.goBack()} title="Para contactar" />
      {list.isPending ? (
        <LoadingState label="Cargando la lista" />
      ) : list.isError || list.data?.status !== 200 ? (
        <QueryFailure label="No pudimos cargar la lista." onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="person"
          message="Aquí aparecen las clientas nuevas que dejan de reservar o toman pocas clases."
          title="Nadie para contactar por ahora."
          variant="plain"
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, tablet && styles.tablet]}
          refreshControl={refreshControl}
        >
          <BodyText style={styles.intro}>
            Clientas nuevas que conviene escribir por WhatsApp. Salen solas de la lista cuando
            reservan una clase.
          </BodyText>
          {notice === null ? null : (
            <Text
              accessibilityRole={notice.kind === "error" ? "alert" : undefined}
              style={notice.kind === "error" ? styles.error : styles.success}
            >
              {notice.kind === "success"
                ? `Marcaste a ${notice.name} como contactada.`
                : `No pudimos marcar a ${notice.name}. Inténtalo de nuevo.`}
            </Text>
          )}
          {items.map((item) => (
            <ContactCard
              busy={markingId === item.clientId}
              item={item}
              key={item.clientId}
              onContacted={onContacted}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { flex: 1 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  card: {
    ...surfaces.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  error: { color: colors.errorText, fontSize: typography.body },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.mdLg },
  identityBody: { flex: 1, gap: 3 },
  intro: { color: colors.textSubtle, fontSize: typography.note },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  name: { color: colors.text, fontSize: typography.bodyMedium },
  phone: { color: colors.textMuted, fontSize: typography.note },
  reason: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  reasonText: { color: colors.text, fontSize: 14 },
  screen: { gap: spacing.md },
  started: { color: colors.textMuted, fontSize: typography.note },
  success: { color: colors.successText, fontSize: typography.body },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
