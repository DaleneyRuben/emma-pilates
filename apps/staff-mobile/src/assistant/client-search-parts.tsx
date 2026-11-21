import {
  getSearchAssistantClientsQueryKey,
  useSearchAssistantClients,
} from "@pilates/api-contracts";
import {
  Chevron,
  ClientFace,
  colors,
  ExceptionPill,
  fieldTextProps,
  Glyph,
  IconRowGroup,
  LineIcon,
  QueryFailure,
  radii,
  shadows,
  spacing,
  StateScreen,
  surfaces,
  Text,
  UnreadCountPill,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useEffect, useState, type ReactElement } from "react";
import { Circle, Path } from "react-native-svg";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

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

const newClientLabel = "Crear clienta nueva";

// The Buscar clienta redesign (option A, 2026-11-21): under the results «Crear
// clienta nueva» is an outlined button with a plus, not another white row.
export function NewClientLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={newClientLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.newClient, pressed && styles.pressed]}
      testID="client-search-new-client"
    >
      <PlusIcon />
      <Text variant="boton">{newClientLabel}</Text>
    </Pressable>
  );
}

function PlusIcon() {
  return (
    <LineIcon color={colors.text} size={20} strokeWidth={1.7}>
      <Path d="M12 5v14M5 12h14" />
    </LineIcon>
  );
}

/**
 * Before a search (option A): one white card with «Nueva clienta» and
 * «Facturas por subir», each behind a 50 disc. No hint asks for two letters;
 * the results simply appear from the second one.
 */
export function ClientSearchShortcuts({
  invoiceCount,
  onInvoices,
  onNewClient,
}: {
  invoiceCount: number;
  onInvoices: () => void;
  onNewClient: () => void;
}) {
  return (
    <View style={styles.shortcuts}>
      <Pressable
        accessibilityLabel="Nueva clienta, crea su ficha si aún no está"
        accessibilityRole="button"
        onPress={onNewClient}
        style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
        testID="client-search-new-client"
      >
        <View style={styles.disc}>
          <PlusIcon />
        </View>
        <View style={styles.shortcutBody}>
          <Text variant="titulo-fila">Nueva clienta</Text>
          <Text variant="secundario">Crea su ficha si aún no está</Text>
        </View>
        <Chevron size={16} strokeWidth={1.5} tone="muted" />
      </Pressable>
      <View style={styles.hairline} />
      <Pressable
        accessibilityLabel={
          invoiceCount > 0 ? `Facturas por subir, ${invoiceCount}` : "Facturas por subir"
        }
        accessibilityRole="button"
        onPress={onInvoices}
        style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
        testID="client-search-invoices"
      >
        <View style={styles.disc}>
          <Glyph color={colors.text} name="document" size={20} strokeWidth={1.6} />
        </View>
        <Text style={styles.shortcutBody} variant="titulo-fila">
          Facturas por subir
        </Text>
        <UnreadCountPill count={invoiceCount} />
        <Chevron size={16} strokeWidth={1.5} tone="muted" />
      </Pressable>
    </View>
  );
}

export function ClientSearchField({ search }: { search: ClientSearch }) {
  const { setText, text } = search;
  const [focused, setFocused] = useState(false);
  // The white field with the card shadow; typing or focus rings it in 600 (E-S03).
  return (
    <View style={[styles.field, (focused || text !== "") && styles.fieldActive]}>
      <LineIcon color={colors.text} size={20} strokeWidth={1.7}>
        <Circle cx={11} cy={11} r={6.5} />
        <Path d="M16 16l4 4" />
      </LineIcon>
      <TextInput
        {...fieldTextProps(text)}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onBlur={() => setFocused(false)}
        onChangeText={setText}
        onFocus={() => setFocused(true)}
        placeholder="Nombre, teléfono o correo"
        style={[fieldTextProps(text).style, styles.input]}
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
    return <SearchHint accessibilityLabel="Buscando clientas">Buscando…</SearchHint>;
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
      style={styles.scroll}
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

/** A quiet line of the search: a `cuerpo` sentence on a white card, never on the 100 screen. */
export function SearchHint({
  accessibilityLabel,
  children,
}: {
  accessibilityLabel?: string;
  children: string;
}) {
  return (
    <View style={styles.hintCard}>
      <Text accessibilityLabel={accessibilityLabel} style={styles.hint} variant="cuerpo">
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clear: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  field: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.card,
    borderRadius: radii.button,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.smLg,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  fieldActive: { borderColor: colors.primary },
  hint: { textAlign: "center" },
  hintCard: {
    ...surfaces.card,
    alignItems: "center",
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.xlSm,
  },
  input: { flex: 1, minHeight: 52 },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.xs,
  },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderColor: colors.borderSoft,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  newClient: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  // The list reaches the screen's sides so the cards' shadows show.
  scroll: { marginHorizontal: -spacing.xlSm },
  shortcut: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smLg,
  },
  shortcutBody: { flex: 1, gap: spacing.xxs },
  shortcuts: { ...surfaces.card, overflow: "hidden" },
});
