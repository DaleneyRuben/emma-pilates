import {
  getListContactAlertsQueryKey,
  useListContactAlerts,
  useMarkClientContacted,
  type ContactAlertItemDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  colors,
  LoadingState,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  StateScreen,
  surfaces,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { useIsTablet } from "../ui/use-is-tablet";
import { sortContactAlerts } from "./contact-list-copy";
import { ContactRow, ContactSheet } from "./contact-list-parts";

type Notice = { kind: "success" | "error"; name: string };

type ContactNavigation = {
  navigate: (
    tab: "ClientsTab",
    nested?: { screen: "ClientOverview"; params: { clientId: string }; initial: false },
  ) => void;
};

/**
 * S28 Para contactar, the Coordinator's second tab (BKM-013, v2), as the calm
 * list of walkthrough finding 113 (proposal A): rows open her sheet.
 */
export function ContactListScreen() {
  const navigation = useNavigation<ContactNavigation>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const list = useListContactAlerts({ fetcher, query: { refetchOnMount: "always" } });
  const mark = useMarkClientContacted({ fetcher });
  const queryKeys = [getListContactAlertsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [open, setOpen] = useState<ContactAlertItemDto | null>(null);
  const items = list.data?.status === 200 ? sortContactAlerts(list.data.data.items) : [];

  const onContacted = (item: ContactAlertItemDto) => {
    setNotice(null);
    mark.mutate(
      { clientId: item.clientId },
      {
        onSuccess: (response) => {
          // The generated client resolves every status; only 204 marked her.
          if (response.status !== 204) {
            setNotice({ kind: "error", name: item.name });
            return;
          }
          setOpen(null);
          void list.refetch();
          setNotice({ kind: "success", name: item.name });
        },
        onError: () => setNotice({ kind: "error", name: item.name }),
      },
    );
  };
  const onClose = () => {
    setOpen(null);
    if (notice?.kind === "error") setNotice(null);
  };
  const onOpenFile = (item: ContactAlertItemDto) => {
    setOpen(null);
    navigation.navigate("ClientsTab", {
      screen: "ClientOverview",
      params: { clientId: item.clientId },
      initial: false,
    });
  };
  const header = (
    <RootHeader
      note="Clientas nuevas que conviene escribir. Salen solas de la lista cuando reservan."
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
          <View>
            <SectionTitle>
              {items.length === 1 ? "1 clienta" : `${items.length} clientas`}
            </SectionTitle>
            <View style={styles.group}>
              {items.map((item, index) => (
                <View key={item.clientId} style={index > 0 && styles.divided}>
                  <ContactRow item={item} onOpen={setOpen} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
      <ContactSheet
        failed={notice?.kind === "error" && notice.name === open?.name}
        item={open}
        marking={mark.isPending}
        onClose={onClose}
        onContacted={onContacted}
        onOpenFile={onOpenFile}
      />
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
  divided: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  group: { ...surfaces.card, overflow: "hidden" },
  list: { gap: spacing.xl, paddingBottom: spacing.xxl },
  screen: { gap: spacing.lg, paddingHorizontal: spacing.xlSm },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
