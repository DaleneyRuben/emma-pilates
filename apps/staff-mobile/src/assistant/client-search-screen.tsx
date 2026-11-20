import { colors, Screen, spacing } from "@pilates/mobile-core";
import { staffRoleLabel, useGetCurrentStaffMemberProfile } from "@pilates/api-contracts";
import { useNavigation } from "@react-navigation/native";
import { Keyboard, StyleSheet, Text, View } from "react-native";

import { usePendingInvoiceCount } from "../invoices/invoices-screen";
import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { PlainRow, PlainRowGroup } from "../ui/plain-rows";
import { RootHeader } from "../ui/root-header";
import { useAssistantWorkspace } from "./assistant-workspace";
import { ClientDetailPanel } from "./client-panel";
import {
  ClientSearchField,
  ClientSearchResults,
  NewClientLink,
  searchStyles,
  useClientSearch,
} from "./client-search-parts";

export type ClientSearchNavigation = {
  navigate: {
    (screen: "NewClient" | "Invoices"): void;
    (screen: "ClientOverview", params: { clientId: string }): void;
  };
};

export function ClientSearchScreen() {
  const navigation = useNavigation<ClientSearchNavigation>();
  const fetcher = useStaffFetcher();
  const search = useClientSearch();
  const { searching } = search;
  const workspace = useAssistantWorkspace();
  const selectedId = workspace.split ? workspace.panel?.clientId : undefined;
  const open = (clientId: string) => {
    if (!workspace.split) {
      navigation.navigate("ClientOverview", { clientId });
      return;
    }
    // The search field stays beside the panel, so a keyboard left open would
    // swallow the panel's first tap.
    Keyboard.dismiss();
    workspace.show({ view: "overview", clientId });
  };

  // FIX-044: the Assistant and the Coordinator have no Pagos tab, so the
  // invoices still to upload open from here (design E3).
  const invoiceCount = usePendingInvoiceCount();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const member = profile.data?.status === 200 ? profile.data.data : undefined;
  const role = useStaffRole();
  const roleLabel = staffRoleLabel(role, member?.gender);
  const eyebrow =
    member?.branches.length === 1 ? `${roleLabel} · ${member.branches[0]?.name}` : roleLabel;

  const newClient = () => navigation.navigate("NewClient");
  const newClientLink = <NewClientLink onPress={newClient} />;
  const content = (
    <>
      <RootHeader bell eyebrow={eyebrow} label="Buscar clienta" title="Buscar clienta" />
      <ClientSearchField search={search} />
      {searching ? null : (
        <PlainRowGroup>
          <PlainRow
            label="Facturas por subir"
            onPress={() => navigation.navigate("Invoices")}
            testID="client-search-invoices"
            value={invoiceCount > 0 ? String(invoiceCount) : undefined}
          />
        </PlainRowGroup>
      )}
      {searching ? (
        <ClientSearchResults
          newClientLink={newClientLink}
          onNewClient={newClient}
          onOpen={open}
          search={search}
          selectedId={selectedId}
        />
      ) : (
        <>
          <View style={searchStyles.hintCard}>
            <Text style={searchStyles.hint}>
              Escribe al menos dos letras o números para buscar.
            </Text>
          </View>
          {newClientLink}
        </>
      )}
    </>
  );

  if (!workspace.split) {
    return <Screen style={styles.screen}>{content}</Screen>;
  }
  return (
    <Screen style={styles.split}>
      <View style={styles.searchPanel}>{content}</View>
      <View style={styles.detailPanel}>
        <ClientDetailPanel />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  detailPanel: { borderLeftColor: colors.hairline, borderLeftWidth: 1, flex: 1 },
  screen: { gap: spacing.md, paddingHorizontal: spacing.xlSm },
  searchPanel: { gap: spacing.md, paddingRight: spacing.lg, width: 360 },
  split: { flexDirection: "row", paddingRight: 0 },
});
