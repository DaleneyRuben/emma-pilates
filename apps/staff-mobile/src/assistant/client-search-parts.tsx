import {
  getSearchAssistantClientsQueryKey,
  useSearchAssistantClients,
} from "@pilates/api-contracts";
import {
  ClientFace,
  colors,
  ExceptionPill,
  fontFamilies,
  Glyph,
  IconRowGroup,
  LineIcon,
  QueryFailure,
  radii,
  spacing,
  StateScreen,
  TextButton,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useEffect, useState, type ReactElement } from "react";
import { Circle, Path } from "react-native-svg";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { PersonRow } from "../ui/person-row";
import { describeContact } from "./assistant-format";

const minimumQueryLength = 2;
const debounceMilliseconds = 250;
const placeholder = "Buscar por nombre, teléfono o correo";

/**
 * The Client search shared by Clientas and the Assistant's «Hoy» (E7): the
 * typed text, the debounced query, and its results.
 */
export function useClientSearch() {
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
  return { refreshControl, results, searching, setText, text };
}

export type ClientSearch = ReturnType<typeof useClientSearch>;

// FIX-083 (Ronda 2 pick A): «Nueva clienta» is a quiet link under the results.
export function NewClientLink({ onPress }: { onPress: () => void }) {
  return (
    <TextButton
      label="¿No está? Crear clienta nueva"
      onPress={onPress}
      style={styles.newClient}
      testID="client-search-new-client"
    />
  );
}

export function ClientSearchField({ search }: { search: ClientSearch }) {
  const { setText, text } = search;
  return (
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
  );
}

/** What a search of two letters or more shows: loading, failure, nobody, or the Clients. */
export function ClientSearchResults({
  newClientLink,
  onNewClient,
  onOpen,
  search,
  selectedId,
}: {
  newClientLink: ReactElement;
  onNewClient: () => void;
  onOpen: (clientId: string) => void;
  search: ClientSearch;
  selectedId?: string;
}) {
  const fetcher = useStaffFetcher();
  const { refreshControl, results } = search;
  if (results.isPending) {
    return (
      <Text accessibilityLabel="Buscando clientas" style={styles.hint}>
        Buscando…
      </Text>
    );
  }
  if (results.isError || results.data.status !== 200) {
    return (
      <>
        <QueryFailure label="No pudimos buscar clientas." onRetry={() => void results.refetch()} />
        {newClientLink}
      </>
    );
  }
  const clients = results.data.data;
  if (clients.length === 0) {
    return (
      <StateScreen
        icon="person"
        layout="inList"
        note="Revisa cómo lo escribiste o crea una ficha nueva."
        primaryAction={{
          label: "Nueva clienta",
          onPress: onNewClient,
          testID: "client-search-empty-new-client",
        }}
        title="No encontramos a nadie"
      />
    );
  }
  return (
    <ScrollView
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      <IconRowGroup>
        {clients.map((client) => (
          <PersonRow
            accessibilityLabel={`Ver clienta ${client.name}`}
            detail={describeContact(client.phone, client.email)}
            face={
              <ClientFace fetcher={fetcher} name={client.name} photo={client.photo} size={36} />
            }
            key={client.id}
            name={client.name}
            onPress={() => onOpen(client.id)}
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
  );
}

export const searchStyles = StyleSheet.create({
  hint: {
    fontFamily: fontFamilies.body,
    color: colors.textMuted,
    fontSize: typography.note,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  clear: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
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
  hint: searchStyles.hint,
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 52,
  },
  list: { gap: spacing.lg, paddingBottom: spacing.xxl },
  newClient: { alignSelf: "flex-start" },
});
