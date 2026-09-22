import {
  useGetCurrentClientCredit,
  useGetCurrentClientProfile,
  useGetCurrentClientSubscription,
  useGetUnreadNotificationCount,
} from "@pilates/api-contracts";
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
  TextButton,
  typography,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { subscriptionBadge } from "../home/home-format";
import { formatBolivianos } from "../plans/plan-format";

type ProfileNavigation = {
  navigate: (
    screen:
      | "EditProfile"
      | "Subscription"
      | "Notifications"
      | "ChangePassword"
      | "Referrals"
      | "Credit",
  ) => void;
};

function MenuRow({
  badge,
  label,
  onPress,
  value,
}: {
  badge?: number;
  label: string;
  onPress: () => void;
  value?: string;
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
        {value === undefined ? null : (
          <BodyText style={styles.rowValue}>{value}</BodyText>
        )}
        {badge === undefined || badge === 0 ? null : (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{String(badge)}</Text>
          </View>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const identity = useMobileIdentity();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const profile = useGetCurrentClientProfile(queryOptions);
  const subscription = useGetCurrentClientSubscription(queryOptions);
  const unread = useGetUnreadNotificationCount(queryOptions);
  const credit = useGetCurrentClientCredit(queryOptions);

  const header = <Heading accessibilityLabel="Perfil">Perfil</Heading>;

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

  const client = profile.data.data;
  const status =
    subscription.data?.status === 200 ? subscription.data.data.status : null;
  const unreadCount =
    unread.data?.status === 200 ? unread.data.data.unread : undefined;
  const availableCredit =
    credit.data?.status === 200 ? credit.data.data.availableCentavos : undefined;

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(client.name)}</Text>
          </View>
          <View style={styles.summaryBody}>
            <Text style={styles.name}>{client.name}</Text>
            <BodyText>{client.email}</BodyText>
            {client.phone ? <BodyText>{client.phone}</BodyText> : null}
          </View>
          <TextButton
            label="Editar"
            onPress={() => navigation.navigate("EditProfile")}
          />
        </View>
        <View style={styles.menu}>
          <MenuRow
            label="Mi plan"
            onPress={() => navigation.navigate("Subscription")}
            value={
              status === null || status === "none"
                ? undefined
                : subscriptionBadge(status)
            }
          />
          <MenuRow
            label="Mis referidos"
            onPress={() => navigation.navigate("Referrals")}
          />
          <MenuRow
            label="Mi crédito"
            onPress={() => navigation.navigate("Credit")}
            value={
              availableCredit === undefined
                ? undefined
                : formatBolivianos(availableCredit)
            }
          />
          <MenuRow
            badge={unreadCount}
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
    color: colors.primaryDeep,
    fontSize: typography.bodyLarge,
    fontWeight: "600",
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    minWidth: 22,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xxs,
  },
  badgeText: { color: colors.white, fontSize: typography.note, fontWeight: "600" },
  chevron: { color: colors.textSubtle, fontSize: typography.titleSecondary },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  footer: {
    color: colors.textSubtle,
    fontSize: typography.note,
    textAlign: "center",
  },
  logout: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: "center",
  },
  logoutPressed: { borderColor: colors.error },
  logoutText: { color: colors.textSecondary, fontSize: typography.body },
  logoutTextPressed: { color: colors.errorText },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  name: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: { color: colors.text, fontSize: typography.body },
  rowTrailing: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  rowValue: { color: colors.textMuted },
  screen: { gap: spacing.lg },
  summary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryBody: { flex: 1, gap: spacing.xxs },
});
