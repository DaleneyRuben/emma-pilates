import {
  getSearchAssistantClientsQueryKey,
  useSearchAssistantClients,
} from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  Glyph,
  IconRowGroup,
  LineIcon,
  QueryFailure,
  radii,
  Screen,
  spacing,
  StateScreen,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useGetCurrentStaffMemberProfile } from "@pilates/api-contracts";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Circle, Path } from "react-native-svg";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { roleLabel } from "../profile/staff-labels";
import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { PersonRow } from "../ui/person-row";
import { RootHeader } from "../ui/root-header";
import { StatusPill } from "../ui/session-row";
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

// v2 S04: the secondary «Nuevo cliente» under the search field.
function NewClientButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Nuevo cliente"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.newClient, pressed && styles.pressed]}
      testID="client-search-new-client"
    >
      <Glyph color={colors.primaryOnTint} name="person" size={18} strokeWidth={1.6} />
      <Text style={styles.newClientLabel}>Nuevo cliente</Text>
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

  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const member = profile.data?.status === 200 ? profile.data.data : undefined;
  const role = useStaffRole();
  const eyebrow =
    member?.branches.length === 1
      ? `${roleLabel(role)} · ${member.branches[0]?.name}`
      : roleLabel(role);

  const search = (
    <>
      <RootHeader bell eyebrow={eyebrow} label="Buscar cliente" title="Buscar cliente" />
      <View style={styles.field}>
        <LineIcon color={colors.textMuted} size={18} strokeWidth={1.5}>
          <Circle cx={11} cy={11} r={6.5} />
          <Path d="M16 16l4 4" />
        </LineIcon>
        <TextInput
          accessibilityLabel={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setText}
          placeholder="Nombre, teléfono o correo"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          testID="client-search-input"
          value={text}
        />
        {text === "" ? null : (
          <Pressable
            accessibilityLabel="Borrar búsqueda"
            accessibilityRole="button"
            hitSlop={spacing.sm}
            onPress={() => setText("")}
            style={styles.clear}
          >
            <Glyph color={colors.textMuted} name="cross" size={16} strokeWidth={1.6} />
          </Pressable>
        )}
      </View>
      {coordinator || (searching && clients.length === 0 && results.data?.status === 200) ? null : (
        <NewClientButton onPress={() => navigation.navigate("NewClient")} />
      )}
      {!searching ? (
        <Text style={styles.hint}>Escribe al menos dos letras o números para buscar.</Text>
      ) : results.isPending ? (
        <Text accessibilityLabel="Buscando clientes" style={styles.hint}>
          Buscando…
        </Text>
      ) : results.isError || results.data.status !== 200 ? (
        <QueryFailure label="No pudimos buscar clientes." onRetry={() => void results.refetch()} />
      ) : clients.length === 0 ? (
        <StateScreen
          icon="person"
          layout="inList"
          note="Revisa cómo lo escribiste o crea una ficha nueva."
          primaryAction={
            coordinator
              ? undefined
              : {
                  label: "Nuevo cliente",
                  onPress: () => navigation.navigate("NewClient"),
                  testID: "client-search-empty-new-client",
                }
          }
          title="No encontramos a nadie"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          <IconRowGroup>
            {clients.map((client) => (
              <PersonRow
                accessibilityLabel={`Ver cliente ${client.name}`}
                detail={describeContact(client.phone, client.email)}
                key={client.id}
                name={client.name}
                onPress={() => open(client.id)}
                selected={client.id === selectedId}
                testID={`client-result-${client.id}`}
                trailing={
                  client.accountStatus === "pending" ? <StatusPill label="Pendiente" /> : undefined
                }
              />
            ))}
          </IconRowGroup>
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
  clear: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  detailPanel: { borderLeftColor: colors.hairline, borderLeftWidth: 1, flex: 1 },
  field: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  hint: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 52,
  },
  list: { paddingBottom: spacing.xxl },
  newClient: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.button,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
  },
  newClientLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
  screen: { gap: spacing.lg, paddingHorizontal: spacing.xlSm },
  searchPanel: { gap: spacing.md, paddingRight: spacing.lg, width: 360 },
  split: { flexDirection: "row", paddingRight: 0 },
});
