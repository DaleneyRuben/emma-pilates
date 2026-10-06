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
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
  UnreadCountPill,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { ProfileRowIcon, type ProfileRowIconName } from "./profile-row-icons";
import { subscriptionBadge } from "../home/home-format";
import { formatBolivianos } from "../plans/plan-format";
import { ClientAvatar } from "./client-avatar";
import { useClientPhoto } from "./use-client-photo";

type ProfileNavigation = {
  navigate: (
    screen:
      | "EditProfile"
      | "Subscription"
      | "Notifications"
      | "ChangePassword"
      | "CloseAccount"
      | "Referrals"
      | "Credit"
      | "EvaluationAvailability"
      | "MyEvaluations",
  ) => void;
};

function MenuRow({
  badge,
  icon,
  label,
  onPress,
  value,
}: {
  badge?: number;
  icon: ProfileRowIconName;
  label: string;
  onPress: () => void;
  value?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={value === undefined ? label : `${label}: ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
    >
      <ProfileRowIcon name={icon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowTrailing}>
        {value === undefined ? null : (
          <BodyText style={styles.rowValue}>{value}</BodyText>
        )}
        <UnreadCountPill count={badge ?? 0} testID="notifications-row-badge" />
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
  const photoUri = useClientPhoto(client.photo?.imageAssetId ?? null);
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
          <ClientAvatar name={client.name} photoUri={photoUri} size={56} />
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
            icon="plan"
            label="Mi plan"
            onPress={() => navigation.navigate("Subscription")}
            value={
              status === null || status === "none"
                ? undefined
                : subscriptionBadge(status)
            }
          />
          <MenuRow
            icon="evaluation"
            label="Evaluación nutricional"
            onPress={() => navigation.navigate("EvaluationAvailability")}
          />
          <MenuRow
            icon="evaluations"
            label="Mis evaluaciones"
            onPress={() => navigation.navigate("MyEvaluations")}
          />
          <MenuRow
            icon="referrals"
            label="Mis referidos"
            onPress={() => navigation.navigate("Referrals")}
          />
          <MenuRow
            icon="credit"
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
            icon="notifications"
            label="Notificaciones"
            onPress={() => navigation.navigate("Notifications")}
          />
          <MenuRow
            icon="password"
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
        <Pressable
          accessibilityLabel="Cerrar mi cuenta"
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={() => navigation.navigate("CloseAccount")}
          style={styles.closeAccount}
        >
          <Text style={styles.closeAccountText}>Cerrar mi cuenta</Text>
        </Pressable>
        <BodyText style={styles.footer}>
          Emma Pilates Studio · versión 1.0
        </BodyText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chevron: { color: colors.textSubtle, fontSize: typography.titleSecondary },
  closeAccount: {
    alignSelf: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  closeAccountText: {
    color: colors.error,
    fontSize: typography.note,
    fontWeight: "500",
  },
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
    ...surfaces.card,
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
    gap: spacing.mdLg,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: { color: colors.text, flex: 1, fontSize: 16 },
  rowTrailing: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  rowValue: { color: colors.textMuted },
  screen: { gap: spacing.lg },
  summary: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryBody: { flex: 1, gap: spacing.xxs },
});
