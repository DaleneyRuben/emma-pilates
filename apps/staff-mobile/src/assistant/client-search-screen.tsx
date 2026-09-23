import { useSearchAssistantClients } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { describeContact } from "./assistant-format";
import { useAssistantWorkspace } from "./assistant-workspace";
import { ClientDetailPanel } from "./client-panel";

export type ClientSearchNavigation = {
  navigate: {
    (screen: "NewClient"): void;
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
    >
      <Text style={styles.newClientLabel}>+ Nuevo cliente</Text>
    </Pressable>
  );
}

export function ClientSearchScreen() {
  const navigation = useNavigation<ClientSearchNavigation>();
  const fetcher = useStaffFetcher();
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
        value={text}
      />
      <NewClientButton onPress={() => navigation.navigate("NewClient")} />
      {!searching ? (
        <BodyText style={styles.hint}>
          Escribe al menos dos letras o números para buscar.
        </BodyText>
      ) : results.isPending ? (
        <BodyText accessibilityLabel="Buscando clientes">Buscando…</BodyText>
      ) : results.isError || results.data.status !== 200 ? (
        <QueryFailure
          label="No pudimos buscar clientes."
          onRetry={() => void results.refetch()}
        />
      ) : clients.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No se encontró ningún cliente.</Text>
          <BodyText style={styles.hint}>
            Revisa el nombre o crea la cuenta del cliente.
          </BodyText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {clients.map((client) => (
            <Pressable
              accessibilityLabel={`Ver cliente ${client.name}`}
              accessibilityRole="button"
              accessibilityState={{ selected: client.id === selectedId }}
              key={client.id}
              onPress={() => open(client.id)}
              style={[styles.row, client.id === selectedId && styles.rowSelected]}
            >
              <View style={styles.rowBody}>
                <Text style={styles.name}>{client.name}</Text>
                <BodyText style={styles.contact}>
                  {describeContact(client.phone, client.email)}
                </BodyText>
              </View>
              {client.accountStatus === "pending" ? (
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingLabel}>Pendiente</Text>
                </View>
              ) : null}
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
  contact: { color: colors.textSecondary, fontSize: typography.note },
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
  name: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
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
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
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
