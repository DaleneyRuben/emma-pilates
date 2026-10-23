import {
  getSearchAssistantClientsQueryKey,
  useSearchAssistantClients,
} from "@pilates/api-contracts";
import {
  AvatarCircle,
  BodyText,
  Chevron,
  colors,
  fontFamilies,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { RootHeader } from "../ui/root-header";
import { describeContact } from "./assistant-format";
import { useAssistantWorkspace } from "./assistant-workspace";
import { ClientDetailPanel } from "./client-panel";

export type ClientSearchNavigation = {
  navigate: {
    (screen: "NewClient" | "CancelClass"): void;
    (screen: "ClientOverview", params: { clientId: string }): void;
  };
};

const minimumQueryLength = 2;
const debounceMilliseconds = 250;
const placeholder = "Buscar por nombre, teléfono o correo";

function NewClientButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="+ Nuevo cliente"
      accessibilityRole="button"
      onPress={onPress}
      style={styles.newClient}
      testID="client-search-new-client"
    >
      <Text style={styles.newClientLabel}>+ Nuevo cliente</Text>
    </Pressable>
  );
}

export function ClientSearchScreen() {
  const navigation = useNavigation<ClientSearchNavigation>();
  const fetcher = useStaffFetcher();
  // ADR-0102: only the Assistant registers new Clients; the Coordinator
  // cancels a class from here instead (follow-up 158).
  const coordinator = useStaffRole() === "coordinator";
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), debounceMilliseconds);
    return () => clearTimeout(timer);
  }, [text]);

  const searching = query.length >= minimumQueryLength;
  const results = useSearchAssistantClients(
    { query },
    { fetcher, query: { enabled: searching, refetchOnMount: "always" } },
  );
  const queryKeys = [getSearchAssistantClientsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const clients = results.data?.status === 200 ? results.data.data : [];
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

  const search = (
    <>
      <RootHeader label="Buscar cliente" title="Buscar cliente" />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        testID="client-search-input"
        value={text}
      />
      {coordinator ? (
        <TextButton
          label="Cancelar una clase"
          onPress={() => navigation.navigate("CancelClass")}
          testID="client-search-cancel-class"
        />
      ) : (
        <NewClientButton onPress={() => navigation.navigate("NewClient")} />
      )}
      {!searching ? (
        <BodyText style={styles.hint}>Escribe al menos dos letras o números para buscar.</BodyText>
      ) : results.isPending ? (
        <BodyText accessibilityLabel="Buscando clientes">Buscando…</BodyText>
      ) : results.isError || results.data.status !== 200 ? (
        <QueryFailure label="No pudimos buscar clientes." onRetry={() => void results.refetch()} />
      ) : clients.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No se encontró ningún cliente.</Text>
          <BodyText style={styles.hint}>Revisa el nombre o crea la cuenta del cliente.</BodyText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {clients.map((client) => (
            <Pressable
              accessibilityLabel={`Ver cliente ${client.name}`}
              accessibilityRole="button"
              accessibilityState={{ selected: client.id === selectedId }}
              key={client.id}
              onPress={() => open(client.id)}
              style={[styles.row, client.id === selectedId && styles.rowSelected]}
              testID={`client-result-${client.id}`}
            >
              <AvatarCircle fontSize={16} name={client.name} size={42} />
              <View style={styles.rowBody}>
                <Text style={styles.name}>{client.name}</Text>
                <Text ellipsizeMode="tail" numberOfLines={1} style={styles.contact}>
                  {describeContact(client.phone, client.email)}
                </Text>
              </View>
              {client.accountStatus === "pending" ? (
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingLabel}>Pendiente</Text>
                </View>
              ) : null}
              <Chevron />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </>
  );

  if (!workspace.split) {
    return <Screen style={styles.screen}>{search}</Screen>;
  }
  return (
    <Screen style={styles.split}>
      <View style={styles.searchPanel}>{search}</View>
      <View style={styles.detailPanel}>
        <ClientDetailPanel />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contact: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
    textAlign: "center",
  },
  hint: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  name: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.bodyMedium },
  newClient: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  newClientLabel: { color: colors.primaryDeep, fontSize: typography.body, fontWeight: "500" },
  pendingLabel: { color: colors.warningText, fontSize: typography.label, fontWeight: "600" },
  pendingTag: {
    backgroundColor: "rgba(201,154,78,0.16)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  // S04's result row (MOB-042): the avatar, the name over the contact, the chevron.
  // The split view's column (MOB-046) gives the row the frame's 344 pt: the
  // 360 pt panel minus the screen's 16 pt gutter, as the frame's 392 px panel
  // minus its 24 px padding on each side.
  row: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.mdLg,
    paddingHorizontal: spacing.lgXl,
    paddingVertical: spacing.lg,
  },
  rowBody: { flex: 1, gap: 3 },
  rowSelected: { borderColor: colors.primary, borderWidth: 2 },
  screen: { gap: spacing.md },
  detailPanel: {
    borderLeftColor: colors.divider,
    borderLeftWidth: 1,
    flex: 1,
  },
  searchPanel: { gap: spacing.md, paddingRight: spacing.lg, width: 360 },
  split: { flexDirection: "row", paddingRight: 0 },
});
