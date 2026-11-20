import {
  formatTitleDate,
  getGetTodayCashCloseQueryKey,
  getListSessionAvailabilityQueryKey,
  getListStaffInvoicesQueryKey,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
  usePullToRefresh,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";

import { useOwnRoleLabel } from "../profile/staff-labels";
import { BranchField } from "../ui/branch-field";
import { useCashBranches } from "../ui/branch-chips";
import { RootHeader } from "../ui/root-header";
import { CenteredCard } from "./assistant-layout";
import { useAssistantWorkspace } from "./assistant-workspace";
import {
  ClientSearchField,
  ClientSearchResults,
  NewClientLink,
  useClientSearch,
} from "./client-search-parts";
import { TodayAgenda } from "./today-agenda";
import { TodayPending } from "./today-pending";

const refreshKeys = [
  getListSessionAvailabilityQueryKey(),
  getGetTodayCashCloseQueryKey(),
  getListStaffInvoicesQueryKey(),
];

type TodayNavigation = {
  navigate: {
    (screen: "NewClient" | "Invoices"): void;
    (screen: "ClientOverview", params: { clientId: string }): void;
    (screen: "CashTab"): void;
    (screen: "ClientsTab", params: { screen: "ClientSearch" }): void;
  };
};

/**
 * E7 pick A: the Assistant's «Hoy en <sucursal>», her first tab. The Client
 * search on top (the same one as Clientas), today's next class with who is
 * coming, what is still to do, and the classes later in the day.
 */
export function TodayScreen() {
  const navigation = useNavigation<TodayNavigation>();
  const search = useClientSearch();
  const workspace = useAssistantWorkspace();
  const branches = useCashBranches();
  const roleLabel = useOwnRoleLabel();
  const refreshControl = usePullToRefresh(refreshKeys);
  const branch = branches.branch;
  const eyebrow = `${roleLabel} · ${formatTitleDate(boliviaCivilDate(new Date()))}`;
  const title = branch === null ? "Hoy" : `Hoy en ${branch.name}`;

  const open = (clientId: string) => {
    if (!workspace.split) {
      navigation.navigate("ClientOverview", { clientId });
      return;
    }
    // On a tablet her file opens in Clientas' detail panel, beside the search.
    Keyboard.dismiss();
    workspace.show({ view: "overview", clientId });
    navigation.navigate("ClientsTab", { screen: "ClientSearch" });
  };
  const newClient = () => navigation.navigate("NewClient");
  const newClientLink = <NewClientLink onPress={newClient} />;

  let day;
  if (search.searching) {
    day = (
      <ClientSearchResults
        newClientLink={newClientLink}
        onNewClient={newClient}
        onOpen={open}
        search={search}
      />
    );
  } else if (branches.isPending) {
    day = <LoadingState label="Cargando el día" />;
  } else if (branches.isError || branch === null) {
    day = <QueryFailure label="No pudimos cargar las sucursales." onRetry={branches.refetch} />;
  } else {
    day = (
      <ScrollView
        contentContainerStyle={styles.day}
        refreshControl={refreshControl}
        style={styles.scroll}
      >
        {newClientLink}
        <TodayAgenda
          branchId={branch.id}
          key={branch.id}
          pending={
            <TodayPending
              branchId={branch.id}
              onCashClose={() => navigation.navigate("CashTab")}
              onInvoices={() => navigation.navigate("Invoices")}
            />
          }
        />
      </ScrollView>
    );
  }

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={640}>
        <View style={styles.top}>
          <RootHeader bell eyebrow={eyebrow} title={title} />
          {branch !== null && branches.options.length > 1 ? (
            <BranchField
              onSelect={branches.select}
              options={branches.options}
              selectedId={branch.id}
              selectedName={branch.name}
            />
          ) : null}
          <ClientSearchField search={search} />
        </View>
        {day}
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.xs,
  },
  screen: { paddingHorizontal: spacing.xlSm },
  // The day reaches the screen's sides so the cards' shadows show.
  scroll: { marginHorizontal: -spacing.xlSm },
  top: { gap: spacing.md },
});
