import {
  getSearchAssistantClientsQueryKey,
  useSearchAssistantClients,
} from "@pilates/api-contracts";
import {
  ClientFace,
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
  TextButton,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
  ExceptionPill,
} from "@pilates/mobile-core";
import { useGetCurrentStaffMemberProfile } from "@pilates/api-contracts";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Circle, Path } from "react-native-svg";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { usePendingInvoiceCount } from "../invoices/invoices-screen";

import { staffRoleLabel } from "@pilates/api-contracts";
import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { PersonRow } from "../ui/person-row";
import { PlainRow, PlainRowGroup } from "../ui/plain-rows";
import { RootHeader } from "../ui/root-header";
import { describeContact } from "./assistant-format";
import { useAssistantWorkspace } from "./assistant-workspace";
import { ClientDetailPanel } from "./client-panel";

export type ClientSearchNavigation = {
  navigate: {
    (screen: "NewClient" | "Invoices"): void;
    (screen: "ClientOverview", params: { clientId: string }): void;
  };
};

const minimumQueryLength = 2;
const debounceMilliseconds = 250;
const placeholder = "Buscar por nombre, teléfono o correo";

// FIX-083 (Ronda 2 pick A): «Nuevo cliente» is a quiet link under the results.
function NewClientLink({ onPress }: { onPress: () => void }) {
  return (
    <TextButton
      label="¿No está? Crear cliente nuevo"
      onPress={onPress}
      style={styles.newClient}
      testID="client-search-new-client"
    />
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

  // FIX-044: the Assistant and the Coordinator have no Pagos tab, so the
  // invoices still to upload open from here (design E3).
  const invoiceCount = usePendingInvoiceCount();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const member = profile.data?.status === 200 ? profile.data.data : undefined;
  const role = useStaffRole();
  const roleLabel = staffRoleLabel(role, member?.gender);
  const eyebrow =
    member?.branches.length === 1 ? `${roleLabel} · ${member.branches[0]?.name}` : roleLabel;

  const newClientLink = <NewClientLink onPress={() => navigation.navigate("NewClient")} />;
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
      {!searching ? (
        <>
          <Text style={styles.hint}>Escribe al menos dos letras o números para buscar.</Text>
          {newClientLink}
        </>
      ) : results.isPending ? (
        <Text accessibilityLabel="Buscando clientes" style={styles.hint}>
          Buscando…
        </Text>
      ) : results.isError || results.data.status !== 200 ? (
        <>
          <QueryFailure
            label="No pudimos buscar clientes."
            onRetry={() => void results.refetch()}
          />
          {newClientLink}
        </>
      ) : clients.length === 0 ? (
        <StateScreen
          icon="person"
          layout="inList"
          note="Revisa cómo lo escribiste o crea una ficha nueva."
          primaryAction={{
            label: "Nuevo cliente",
            onPress: () => navigation.navigate("NewClient"),
            testID: "client-search-empty-new-client",
          }}
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
                face={
                  <ClientFace fetcher={fetcher} name={client.name} photo={client.photo} size={36} />
                }
                key={client.id}
                name={client.name}
                onPress={() => open(client.id)}
                selected={client.id === selectedId}
                testID={`client-result-${client.id}`}
                trailing={
                  client.accountStatus === "pending" ? (
                    <ExceptionPill>Pendiente</ExceptionPill>
                  ) : undefined
                }
              />
            ))}
          </IconRowGroup>
          {newClientLink}
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
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.button,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  hint: {
    fontFamily: fontFamilies.body,
    color: colors.textMuted,
    fontSize: typography.note,
    textAlign: "center",
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 52,
  },
  list: { gap: spacing.lg, paddingBottom: spacing.xxl },
  newClient: { alignSelf: "flex-start" },
  screen: { gap: spacing.lg, paddingHorizontal: spacing.xlSm },
  searchPanel: { gap: spacing.md, paddingRight: spacing.lg, width: 360 },
  split: { flexDirection: "row", paddingRight: 0 },
});
