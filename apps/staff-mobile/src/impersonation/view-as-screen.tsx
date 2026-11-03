import { useListBranches, useListStaffMembers, type StaffMemberDto } from "@pilates/api-contracts";
import {
  ConfirmationSheet,
  EmptyState,
  fontFamilies,
  colors,
  IconRow,
  IconRowGroup,
  LoadingState,
  NoticeRow,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { roleLabel } from "../profile/staff-labels";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { PersonRow } from "../ui/person-row";
import { createImpersonationApi } from "./impersonation-api";
import { useImpersonation } from "./impersonation-context";

type ImpersonableRole = "trainer" | "assistant" | "nutritionist" | "coordinator";
const roleOrder: ImpersonableRole[] = ["trainer", "assistant", "nutritionist", "coordinator"];
const isImpersonable = (
  member: StaffMemberDto,
): member is StaffMemberDto & { role: ImpersonableRole } => member.role !== "administrator";

// S24 (FUT-001, v2): the active team, never another Administrator.
export function ViewAsScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const { refreshSession } = useImpersonation();
  const api = useMemo(() => createImpersonationApi(fetcher), [fetcher]);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<StaffMemberDto | null>(null);
  const [busy, setBusy] = useState(false);
  const members = useListStaffMembers(
    { status: "active", pageSize: 100 },
    { fetcher, query: { refetchOnMount: "always" } },
  );
  const branches = useListBranches({ fetcher });
  const branchNames = new Map(
    (branches.data?.status === 200 ? branches.data.data : []).map((branch) => [
      branch.id,
      branch.name,
    ]),
  );
  const header = (
    <BackBar
      back="Perfil"
      onBack={() => navigation.goBack()}
      subtitle="Verás sus clases y su agenda durante 30 minutos. Sales cuando quieras desde la franja de arriba."
      title="Ver la app como…"
    />
  );

  if (members.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando personal" />
      </Screen>
    );
  }
  if (members.isError || members.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar al personal."
          onRetry={() => void members.refetch()}
        />
      </Screen>
    );
  }

  const people = members.data.data.items
    .filter(isImpersonable)
    .sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));
  const firstName = confirming === null ? "" : (confirming.name.split(" ")[0] ?? confirming.name);
  const start = async () => {
    if (confirming === null) return;
    setBusy(true);
    setFailure(null);
    try {
      await api.start(confirming.id);
      await refreshSession();
    } catch {
      setFailure("No pudimos empezar a ver la app como esa persona. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const branchesOf = (member: StaffMemberDto) =>
    member.branchIds.length === 0
      ? "Todas las sucursales"
      : member.branchIds
          .map((id) => branchNames.get(id) ?? "")
          .filter(Boolean)
          .join(", ");

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        {failure === null ? null : (
          <View accessibilityLabel={failure} accessibilityRole="alert">
            <NoticeRow message={failure} />
          </View>
        )}
        {people.length === 0 ? (
          <EmptyState
            message="Cuando actives a una entrenadora, asistente o nutricionista, aparecerá aquí."
            title="Nadie a quien ver todavía"
            variant="plain"
          />
        ) : (
          <View>
            <SectionTitle>El equipo</SectionTitle>
            <IconRowGroup>
              {people.map((member) => (
                <PersonRow
                  accessibilityLabel={member.name}
                  detail={`${roleLabel(member.role)} · ${branchesOf(member)}`}
                  key={member.id}
                  name={member.name}
                  onPress={() => setConfirming(member)}
                  testID={`view-as-${member.id}`}
                />
              ))}
            </IconRowGroup>
            <Text style={styles.footnote}>Nunca aparece otra persona de administración.</Text>
          </View>
        )}
      </ScrollView>
      {/* S24's sheet (UX-002): the solid action, since starting is not destructive. */}
      <ConfirmationSheet
        busy={busy}
        confirmLabel={`Ver como ${firstName}`}
        confirmTestID="view-as-confirm"
        dismissLabel="Cancelar"
        note="Sales cuando quieras desde la franja de arriba."
        onConfirm={() => void start()}
        onDismiss={() => setConfirming(null)}
        testID="view-as-sheet"
        title={`¿Ver la app como ${confirming?.name ?? ""}?`}
        tone="primary"
        visible={confirming !== null}
      >
        <IconRowGroup>
          <IconRow icon="clock" label="Durante 30 minutos verás sus clases" />
          <IconRow icon="person" label="Lo que hagas queda registrado a tu nombre" />
        </IconRowGroup>
      </ConfirmationSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // S24: a 560 pt column on the tablet, the full width on a phone.
  content: {
    alignSelf: "center",
    gap: spacing.xl,
    maxWidth: 560,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  footnote: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    marginTop: spacing.md,
    textAlign: "center",
  },
  screen: { paddingHorizontal: spacing.xlSm },
});
