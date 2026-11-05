import {
  getGetCurrentClientProfileQueryKey,
  getGetCurrentClientSubscriptionQueryKey,
  getGetUnreadNotificationCountQueryKey,
  useGetCurrentClientProfile,
  useGetCurrentClientSubscription,
  useGetUnreadNotificationCount,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  fontFamilies,
  Heading,
  IconRow,
  IconRowGroup,
  LoadingState,
  LogoutConfirmationSheet,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  surfaces,
  TextButton,
  typography,
  useMobileIdentity,
  useRefetchOnFocus,
  phoneWithFlag,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { appVersionLabel } from "./app-version";
import { ClientAvatar } from "./client-avatar";
import { PromotionsSwitch, promotionsLegalLine } from "./promotions-switch";
import { useClientPhoto } from "./use-client-photo";

type ProfileNavigation = {
  navigate: (
    screen:
      | "EditProfile"
      | "Subscription"
      | "Notifications"
      | "ChangePassword"
      | "Feedback"
      | "CloseAccount"
      | "Referrals"
      | "EvaluationAvailability"
      | "MyEvaluations",
  ) => void;
};

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const identity = useMobileIdentity();
  const fetcher = useClientFetcher();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const profile = useGetCurrentClientProfile(queryOptions);
  const subscription = useGetCurrentClientSubscription(queryOptions);
  const unread = useGetUnreadNotificationCount(queryOptions);
  useRefetchOnFocus([
    getGetCurrentClientProfileQueryKey(),
    getGetCurrentClientSubscriptionQueryKey(),
    getGetUnreadNotificationCountQueryKey(),
  ]);
  const photoUri = useClientPhoto(
    profile.data?.status === 200 ? (profile.data.data.photo?.imageAssetId ?? null) : null,
  );

  const header = <Heading accessibilityLabel="Perfil">Perfil</Heading>;

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

  const client = profile.data.data;
  const status = subscription.data?.status === 200 ? subscription.data.data.status : null;
  const unreadCount = unread.data?.status === 200 ? unread.data.data.unread : undefined;

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <ClientAvatar name={client.name} photoUri={photoUri} size={56} />
          <View style={styles.summaryBody}>
            <Text style={styles.name}>{client.name}</Text>
            <BodyText>{client.email}</BodyText>
            {client.phone ? <BodyText>{phoneWithFlag(client.phone)}</BodyText> : null}
          </View>
          <TextButton label="Editar" onPress={() => navigation.navigate("EditProfile")} />
        </View>
        <View>
          <SectionTitle>Tu plan y tus clases</SectionTitle>
          <IconRowGroup>
            <IconRow
              chevron
              icon="card"
              label="Mi plan"
              onPress={() => navigation.navigate("Subscription")}
              value={status === null || status === "none" ? undefined : planPill[status]}
            />
            <IconRow
              chevron
              icon="health"
              label="Evaluación nutricional"
              onPress={() => navigation.navigate("EvaluationAvailability")}
            />
            <IconRow
              chevron
              icon="document"
              label="Mis evaluaciones"
              onPress={() => navigation.navigate("MyEvaluations")}
            />
            <IconRow
              chevron
              icon="personAdd"
              label="Invita a una amiga"
              onPress={() => navigation.navigate("Referrals")}
            />
          </IconRowGroup>
        </View>
        <View>
          <SectionTitle>Preferencias</SectionTitle>
          <View style={styles.group}>
            <IconRow
              chevron
              icon="bell"
              label="Notificaciones"
              onPress={() => navigation.navigate("Notifications")}
              value={
                unreadCount === undefined || unreadCount === 0
                  ? undefined
                  : `${unreadCount} sin leer`
              }
            />
            <PromotionsSwitch />
          </View>
          <BodyText style={styles.legal}>{promotionsLegalLine}</BodyText>
        </View>
        <View>
          <SectionTitle>Cuenta</SectionTitle>
          <IconRowGroup>
            <IconRow
              chevron
              icon="password"
              label="Cambiar contraseña"
              onPress={() => navigation.navigate("ChangePassword")}
            />
            <IconRow
              chevron
              icon="message"
              label="Enviar comentarios"
              onPress={() => navigation.navigate("Feedback")}
            />
            <IconRow
              icon="logout"
              label="Cerrar sesión"
              onPress={() => setConfirmingLogout(true)}
            />
          </IconRowGroup>
        </View>
        <View style={styles.end}>
          <TextButton
            label="Cerrar mi cuenta"
            onPress={() => navigation.navigate("CloseAccount")}
            tone="error"
          />
          <BodyText style={styles.footer}>
            {`Emma Pilates Studio · versión ${appVersionLabel()}`}
          </BodyText>
        </View>
      </ScrollView>
      <LogoutConfirmationSheet
        logout={identity.logout}
        onDismiss={() => setConfirmingLogout(false)}
        visible={confirmingLogout}
      />
    </Screen>
  );
}

// C18: the Plan's state as Mi plan names it.
const planPill = { active: "Activo", expiring_soon: "Por vencer", expired: "Vencido" } as const;

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  end: { alignItems: "center", gap: spacing.xs },
  footer: { color: colors.textMuted, fontSize: typography.label, textAlign: "center" },
  group: { ...surfaces.card },
  legal: { color: colors.textMuted, fontSize: typography.note, marginTop: spacing.sm },
  name: { color: colors.text, fontFamily: fontFamilies.display, fontSize: typography.titleCard },
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
