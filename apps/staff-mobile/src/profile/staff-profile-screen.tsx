import {
  useGetCurrentStaffMemberProfile,
  useGetUnreadNotificationCount,
} from "@pilates/api-contracts";
import {
  BodyText,
  Chevron,
  colors,
  confirmLogout,
  initials,
  LoadingState,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
  UnreadCountPill,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { branchesLabel, roleLabel } from "./staff-labels";

type ProfileNavigation = {
  goBack: () => void;
  navigate: (screen: "Notifications" | "ChangePassword" | "ViewAs") => void;
};

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <BodyText style={styles.rowValue}>{value}</BodyText>
    </View>
  );
}

function MenuRow({
  badge = 0,
  label,
  onPress,
}: {
  badge?: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowTrailing}>
        <UnreadCountPill count={badge} testID="notifications-row-badge" />
        <Chevron tone="quiet" />
      </View>
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

  const unread = useGetUnreadNotificationCount({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const unreadCount = unread.data?.status === 200 ? unread.data.data.unread : 0;

  const header = <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Perfil" />;

  if (profile.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando perfil" />
      </Screen>
    );
  }

  if (profile.isError || profile.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tu perfil." onRetry={() => void profile.refetch()} />
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
            <BodyText style={styles.note}>Tus datos los actualiza administración.</BodyText>
          </View>
        </View>
        <View style={styles.group}>
          <ValueRow label="Rol" value={roleLabel(member.role)} />
          <ValueRow label="Sucursales" value={branchesLabel(member)} />
        </View>
        <View style={styles.group}>
          <MenuRow
            badge={unreadCount}
            label="Notificaciones"
            onPress={() => navigation.navigate("Notifications")}
          />
          <MenuRow
            label="Cambiar contraseña"
            onPress={() => navigation.navigate("ChangePassword")}
          />
          {identity.session?.role === "administrator" ? (
            <MenuRow label="Ver la app como…" onPress={() => navigation.navigate("ViewAs")} />
          ) : null}
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
        <BodyText style={styles.footer}>Emma Pilates Studio · versión 1.0</BodyText>
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
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  footer: {
    color: colors.textSubtle,
    fontSize: typography.note,
    textAlign: "center",
  },
  group: {
    ...surfaces.flatCard,
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
  rowTrailing: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  rowValue: { color: colors.textMuted },
  screen: { gap: spacing.lg },
  summary: {
    ...surfaces.card,
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryBody: { flex: 1, gap: spacing.xxs },
});
