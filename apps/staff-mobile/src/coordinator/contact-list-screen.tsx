import {
  getListContactAlertsQueryKey,
  useListContactAlerts,
  useMarkClientContacted,
  type ContactAlertItemDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, RowCard, SoftNote } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { useIsTablet } from "../ui/use-is-tablet";
import { sortContactAlerts } from "./contact-list-copy";
import { ContactRow, ContactSheet } from "./contact-list-parts";

type Notice = { kind: "success" | "error"; clientId: string; name: string };

type ContactNavigation = {
  navigate: (
    tab: "ClientsTab",
    nested?: { screen: "ClientOverview"; params: { clientId: string }; initial: false },
  ) => void;
};

/**
 * S28 Para contactar, the Coordinator's second tab (BKM-013, v2), as the calm
 * list of walkthrough finding 113 (proposal A): rows open her sheet. Boards
 * K01–K05: the band holds the title alone, the note rides a soft aside, and
 * the Clients are rows of one white card under their count.
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
  // The open sheet follows the live list: she leaves it when she leaves the list.
  const [openId, setOpenId] = useState<string | null>(null);
  const items = list.data?.status === 200 ? sortContactAlerts(list.data.data.items) : [];
  const open = items.find((item) => item.clientId === openId) ?? null;
  const failed = (item: ContactAlertItemDto) =>
    setNotice({ kind: "error", clientId: item.clientId, name: item.name });

  const onContacted = (item: ContactAlertItemDto) => {
    setNotice(null);
    mark.mutate(
      { clientId: item.clientId },
      {
        onSuccess: (response) => {
          // The generated client resolves every status; only 204 marked her.
          void list.refetch();
          if (response.status !== 204) {
            failed(item);
            return;
          }
          setOpenId(null);
          setNotice({ kind: "success", clientId: item.clientId, name: item.name });
        },
        onError: () => failed(item),
      },
    );
  };
  const onClose = () => {
    setOpenId(null);
    if (notice?.kind === "error") setNotice(null);
  };
  const onOpenFile = (item: ContactAlertItemDto) => {
    setOpenId(null);
    navigation.navigate("ClientsTab", {
      screen: "ClientOverview",
      params: { clientId: item.clientId },
      initial: false,
    });
  };
  const header = <RootHeader title="Para contactar" />;
  const note = (
    <SoftNote
      icon="message"
      message="Clientas nuevas que conviene escribir. Salen solas de la lista cuando reservan."
    />
  );

  return (
    <Screen style={styles.screen}>
      {header}
      {list.isPending ? (
        <>
          <View style={styles.state}>{note}</View>
          <LoadingState label="Cargando la lista" />
        </>
      ) : list.isError || list.data?.status !== 200 ? (
        <>
          <QueryFailure label="No pudimos cargar la lista." onRetry={() => void list.refetch()} />
        </>
      ) : items.length === 0 ? (
        <>
          <View style={styles.balance} />
          <StateScreen
            icon="person"
            layout="card"
            note="Aquí aparecen las clientas nuevas que dejan de reservar o toman pocas clases."
            textAction={{
              label: "Buscar una clienta",
              onPress: () => navigation.navigate("ClientsTab"),
            }}
            title="Nadie para contactar"
          />
          <View style={styles.balance} />
        </>
      ) : (
        <ScrollView
          contentContainerStyle={[bodyScroll.content, tablet && styles.tablet]}
          refreshControl={refreshControl}
          style={bodyScroll.scroll}
        >
          {note}
          <RowCard label={items.length === 1 ? "1 clienta" : `${items.length} clientas`}>
            {items.map((item) => (
              <ContactRow
                item={item}
                key={item.clientId}
                onOpen={(row) => setOpenId(row.clientId)}
              />
            ))}
          </RowCard>
        </ScrollView>
      )}
      <ContactSheet
        failed={notice?.kind === "error" && notice.clientId === openId}
        item={open}
        marking={mark.isPending && mark.variables?.clientId === openId}
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
  // Board K05: the empty card sits in the middle of the space under the band.
  balance: { flex: 1 },
  screen: { paddingHorizontal: spacing.lg },
  state: { paddingTop: spacing.md },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
