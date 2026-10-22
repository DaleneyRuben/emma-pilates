import { useListBranches, useListStaffMembers, type StaffMemberDto } from "@pilates/api-contracts";
import {
  BodyText,
  Chevron,
  colors,
  EmptyState,
  initials,
  LoadingState,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { createImpersonationApi } from "./impersonation-api";
import { useImpersonation } from "./impersonation-context";

type ImpersonableRole = "trainer" | "assistant" | "nutritionist";
const groups: { role: ImpersonableRole; label: string }[] = [
  { role: "trainer", label: "Entrenadoras" },
  { role: "assistant", label: "Asistentes" },
  { role: "nutritionist", label: "Nutricionistas" },
];
const isImpersonable = (
  member: StaffMemberDto,
): member is StaffMemberDto & { role: ImpersonableRole } => member.role !== "administrator";

// S24 (FUT-001): the active Trainers, Assistants, and Nutritionists by Role.
export function ViewAsScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const { refreshSession } = useImpersonation();
  const api = useMemo(() => createImpersonationApi(fetcher), [fetcher]);
  const [failure, setFailure] = useState<string | null>(null);
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
    <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Ver la app como…" />
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

  const people = members.data.data.items.filter(isImpersonable);
  const confirm = (member: StaffMemberDto) => {
    const firstName = member.name.split(" ")[0] ?? member.name;
    Alert.alert(
      `¿Ver la app como ${member.name}?`,
      "Durante 30 minutos verás sus clases y sus sucursales y podrás actuar como ella. Todo lo que hagas quedará registrado a tu nombre.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: `Ver como ${firstName}`,
          onPress: async () => {
            setFailure(null);
            try {
              await api.start(member.id);
              await refreshSession();
            } catch {
              setFailure("No pudimos empezar a ver la app como esa persona. Inténtalo de nuevo.");
            }
          },
        },
      ],
    );
  };

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <BodyText style={styles.intro}>
          Verás la app tal como la ve esa persona, con sus clases y sus sucursales, durante 30
          minutos. Puedes salir cuando quieras desde la franja de arriba.
        </BodyText>
        {failure === null ? null : (
          <BodyText accessibilityRole="alert" style={styles.failure}>
            {failure}
          </BodyText>
        )}
        {people.length === 0 ? (
          <EmptyState
            message="Cuando actives a una entrenadora, asistente o nutricionista, aparecerá aquí."
            title="Nadie a quien ver todavía"
            variant="plain"
          />
        ) : null}
        {groups.map(({ role, label }) => {
          const rows = people.filter((member) => member.role === role);
          if (rows.length === 0) return null;
          return (
            <View key={role} style={styles.group}>
              <Text style={styles.eyebrow}>{label}</Text>
              <View style={styles.card}>
                {rows.map((member, index) => (
                  <Pressable
                    accessibilityLabel={member.name}
                    accessibilityRole="button"
                    key={member.id}
                    onPress={() => confirm(member)}
                    style={[styles.row, index < rows.length - 1 && styles.rowRule]}
                    testID={`view-as-${member.id}`}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(member.name)}</Text>
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.name}>{member.name}</Text>
                      <Text numberOfLines={1} style={styles.branches}>
                        {member.branchIds
                          .map((id) => branchNames.get(id) ?? "")
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </View>
                    <Chevron />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: { color: colors.primaryOnTint, fontSize: typography.body, fontWeight: "500" },
  branches: { color: colors.textMuted, fontSize: typography.note },
  card: { ...surfaces.flatCard, overflow: "hidden" },
  // S24: a 560 pt column on the tablet, the full width on a phone.
  content: {
    alignSelf: "center",
    gap: spacing.xl,
    maxWidth: 560,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  failure: { color: colors.errorText },
  group: { gap: spacing.sm },
  intro: { color: colors.textMuted, fontSize: typography.note },
  name: { color: colors.text, fontSize: typography.body },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
  },
  rowBody: { flex: 1, gap: 3 },
  rowRule: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  screen: { gap: spacing.md },
});
