import {
  getListContactAlertsQueryKey,
  useListContactAlerts,
  useMarkClientContacted,
  type ContactAlertItemDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  colors,
  fontFamilies,
  LoadingState,
  NoticeRow,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  surfaces,
  TextButton,
  usePullToRefresh,
  useRefetchOnFocus,
  phoneWithFlag,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { InitialsDisc } from "../ui/person-row";
import { RootHeader } from "../ui/root-header";
import { StatusPill } from "../ui/session-row";
import { useIsTablet } from "../ui/use-is-tablet";
import { contactAlertReasons, startedOnLabel, whatsAppHref } from "./contact-list-copy";

type Notice = { kind: "success" | "error"; name: string };

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
  const started = startedOnLabel(item.startedOn);
  return (
    <View style={styles.card}>
      <View style={styles.identity}>
        <InitialsDisc name={item.name} />
        <View style={styles.identityBody}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.quiet}>
            {`${item.phone === null ? "Sin teléfono" : phoneWithFlag(item.phone)} · ${started.charAt(0).toLowerCase()}${started.slice(1)}`}
          </Text>
        </View>
      </View>
      <View style={styles.reasons}>
        {item.reasons.map((reason) => (
          <StatusPill key={reason} label={contactAlertReasons[reason]} />
        ))}
      </View>
      <View style={styles.actions}>
        {href === null ? null : (
          <TextButton label="Abrir WhatsApp" onPress={() => void Linking.openURL(href)} />
        )}
        <TextButton disabled={busy} label="Marcar contactada" onPress={() => onContacted(item)} />
      </View>
    </View>
  );
}

/** S28 Para contactar, the Coordinator's second tab (BKM-013, v2). */
export function ContactListScreen() {
  const navigation = useNavigation<{ navigate: (tab: "ClientsTab") => void }>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const list = useListContactAlerts({ fetcher, query: { refetchOnMount: "always" } });
  const mark = useMarkClientContacted({ fetcher });
  const queryKeys = [getListContactAlertsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = list.data?.status === 200 ? list.data.data.items : [];
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
  const header = (
    <RootHeader
      note="Clientas nuevas que conviene escribir por WhatsApp. Salen solas de la lista cuando reservan."
      title="Para contactar"
    />
  );

  return (
    <Screen style={styles.screen}>
      {list.isPending ? (
        <>
          {header}
          <LoadingState label="Cargando la lista" />
        </>
      ) : list.isError || list.data?.status !== 200 ? (
        <>
          {header}
          <QueryFailure label="No pudimos cargar la lista." onRetry={() => void list.refetch()} />
        </>
      ) : items.length === 0 ? (
        <>
          <RootHeader title="Para contactar" />
          <StateScreen
            icon="person"
            note="Aquí aparecen las clientas nuevas que dejan de reservar o toman pocas clases."
            textAction={{
              label: "Buscar una clienta",
              onPress: () => navigation.navigate("ClientsTab"),
            }}
            title="Nadie para contactar"
          />
        </>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, tablet && styles.tablet]}
          refreshControl={refreshControl}
        >
          {header}
          {notice?.kind === "error" ? (
            <View accessibilityRole="alert">
              <NoticeRow message={`No pudimos marcar a ${notice.name}. Inténtalo de nuevo.`} />
            </View>
          ) : null}
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
      {notice?.kind === "success" ? (
        <BrandToast
          note="Sale de la lista y queda registrado a tu nombre"
          onClose={() => setNotice(null)}
          // S28: «Valeria, contactada», her first name only.
          title={`${notice.name.trim().split(/\s+/)[0] ?? notice.name}, contactada`}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  card: { ...surfaces.card, gap: spacing.md, paddingBottom: spacing.xs, padding: spacing.lg },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  identityBody: { flex: 1, gap: spacing.xxs },
  list: { gap: spacing.lg, paddingBottom: spacing.xxl },
  name: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 16 },
  quiet: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  reasons: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  screen: { gap: spacing.lg, paddingHorizontal: spacing.xlSm },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
