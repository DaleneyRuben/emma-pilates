import { useGetCurrentStaffMemberProfile } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  confirmLogout,
  Heading,
  initials,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { branchesLabel, roleLabel } from "./staff-labels";

type ProfileNavigation = {
  goBack: () => void;
  navigate: (screen: "Notifications" | "ChangePassword") => void;
};

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <BodyText style={styles.rowValue}>{value}</BodyText>
    </View>
  );
}

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function StaffProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const identity = useMobileIdentity();
  const fetcher = useStaffFetcher();
  const profile = useGetCurrentStaffMemberProfile({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = (
    <>
      <Pressable
        accessibilityLabel="Volver"
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={styles.back}
      >
        <Text style={styles.backLabel}>← Volver</Text>
      </Pressable>
      <Heading accessibilityLabel="Perfil">Perfil</Heading>
    </>
  );

  if (profile.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando perfil">Cargando…</BodyText>
      </Screen>
    );
  }

  if (profile.isError || profile.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tu perfil."
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  const member = profile.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(member.name)}</Text>
          </View>
          <View style={styles.summaryBody}>
            <Text style={styles.name}>{member.name}</Text>
            <BodyText>{member.email}</BodyText>
            {member.phone ? <BodyText>{member.phone}</BodyText> : null}
            <BodyText style={styles.note}>
              Tus datos los actualiza administración.
            </BodyText>
          </View>
        </View>
        <View style={styles.group}>
          <ValueRow label="Rol" value={roleLabel(member.role)} />
          <ValueRow label="Sucursales" value={branchesLabel(member)} />
        </View>
        <View style={styles.group}>
          <MenuRow
            label="Notificaciones"
            onPress={() => navigation.navigate("Notifications")}
          />
          <MenuRow
            label="Cambiar contraseña"
            onPress={() => navigation.navigate("ChangePassword")}
          />
        </View>
        <Pressable
          accessibilityLabel="Cerrar sesión"
          accessibilityRole="button"
          onPress={() => confirmLogout(identity.logout)}
          style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
        >
          {({ pressed }) => (
            <Text style={[styles.logoutText, pressed && styles.logoutTextPressed]}>
              Cerrar sesión
            </Text>
          )}
        </Pressable>
        <BodyText style={styles.footer}>
          Emma Pilates Studio · versión 1.0
        </BodyText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  avatarText: {
    color: colors.primaryOnTint,
    fontSize: typography.bodyLarge,
    fontWeight: "600",
  },
  back: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  backLabel: { color: colors.primaryDeep, fontSize: typography.body },
  chevron: { color: colors.textSubtle, fontSize: typography.titleSecondary },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  footer: {
    color: colors.textSubtle,
    fontSize: typography.note,
    textAlign: "center",
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  logout: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  logoutPressed: { borderColor: colors.error },
  logoutText: { color: colors.textSecondary, fontSize: typography.body },
  logoutTextPressed: { color: colors.errorText },
  name: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  note: { color: colors.textMuted, fontSize: typography.note },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 60,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: { color: colors.text, fontSize: typography.body },
  rowValue: { color: colors.textMuted },
  screen: { gap: spacing.lg },
  summary: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryBody: { flex: 1, gap: spacing.xxs },
});
