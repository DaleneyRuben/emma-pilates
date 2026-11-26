import {
  getGetCurrentClientProfileQueryKey,
  getGetCurrentClientSubscriptionQueryKey,
  getGetUnreadNotificationCountQueryKey,
  useGetCurrentClientProfile,
  useGetCurrentClientSubscription,
  useGetUnreadNotificationCount,
} from "@pilates/api-contracts";
import {
  BiometricSwitchRow,
  BrandToast,
  LoadingState,
  LogoutConfirmationSheet,
  openPublicPage,
  OutlinedButton,
  QueryFailure,
  Screen,
  ScreenHeader,
  SectionTitle,
  spacing,
  surfaces,
  TabletColumns,
  Text,
  useMobileIdentity,
  useRefetchOnFocus,
  useStickyNotice,
  useWideScreen,
  phoneWithFlag,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { appVersionLabel } from "./app-version";
import { ClientAvatar } from "./client-avatar";
import { ProfileRow, ProfileRowCard } from "./profile-rows";
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
      | "MyInvoices",
  ) => void;
  setParams: (params: ProfileParams) => void;
};

/** What a task that returns to Perfil carries back: «Contraseña actualizada». */
export type ProfileParams = { passwordChanged?: true };

export function ProfileScreen({ route }: { route: { params?: ProfileParams } }) {
  const navigation = useNavigation<ProfileNavigation>();
  const dismissPasswordChanged = () => navigation.setParams({ passwordChanged: undefined });
  const passwordChanged = useStickyNotice(route.params?.passwordChanged, dismissPasswordChanged);
  const identity = useMobileIdentity();
  const fetcher = useClientFetcher();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const wide = useWideScreen();
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

  // C18: the tab's root, so the band has no way back.
  const header = <ScreenHeader title="Perfil" />;

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

  // Follow-up 256 § 2: «Cerrar mi cuenta» is a quiet link after the
  // version, away from «Cerrar sesión»; it still opens C24.
  const endBlock = (
    <View style={styles.end}>
      <Text
        style={styles.centered}
        variant="secundario"
      >{`Emma Pilates Studio · versión ${appVersionLabel()} ·`}</Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={spacing.md}
        onPress={() => navigation.navigate("CloseAccount")}
        testID="profile-close-account"
      >
        <Text style={styles.centered} variant="enlace">
          Cerrar mi cuenta
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {/* 18T: on a tablet the identity, «Cerrar sesión» and the version sit
            in a 300 pt column beside the lists. */}
        <TabletColumns
          left={
            <>
              {/* C18: the identity is the screen's one 600 hero. */}
              <View style={[styles.hero, wide && styles.heroStacked]} testID="profile-identity">
                <ClientAvatar name={client.name} onEmphasis photoUri={photoUri} size={56} />
                <View style={[styles.heroBody, wide && styles.heroBodyStacked]}>
                  <Text tone="onDark" variant="titulo-bloque">
                    {client.name}
                  </Text>
                  <Text tone="onDark" variant="cuerpo">
                    {client.email}
                  </Text>
                  {client.phone ? (
                    <Text tone="onDark" variant="cuerpo">
                      {phoneWithFlag(client.phone)}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityLabel="Editar"
                  accessibilityRole="button"
                  hitSlop={spacing.sm}
                  onPress={() => navigation.navigate("EditProfile")}
                  style={styles.edit}
                >
                  <Text tone="onDark" variant="enlace">
                    Editar
                  </Text>
                </Pressable>
              </View>
              {wide ? (
                <>
                  <OutlinedButton
                    label="Cerrar sesión"
                    onPress={() => setConfirmingLogout(true)}
                    testID="profile-logout"
                  />
                  {endBlock}
                </>
              ) : null}
            </>
          }
          leftWidth={300}
          right={
            <>
              <View>
                <SectionTitle>Tu plan y tus clases</SectionTitle>
                <ProfileRowCard>
                  <ProfileRow
                    icon="card"
                    label="Mi plan"
                    onPress={() => navigation.navigate("Subscription")}
                    pill
                    value={status === null || status === "none" ? undefined : planPill[status]}
                  />
                  <ProfileRow
                    icon="leaf"
                    label="Evaluación nutricional"
                    onPress={() => navigation.navigate("EvaluationAvailability")}
                  />
                  <ProfileRow
                    icon="document"
                    label="Mis facturas"
                    onPress={() => navigation.navigate("MyInvoices")}
                  />
                  <ProfileRow
                    icon="personAdd"
                    label="Invita a una amiga"
                    onPress={() => navigation.navigate("Referrals")}
                  />
                </ProfileRowCard>
              </View>
              <View>
                <SectionTitle>Preferencias</SectionTitle>
                <ProfileRowCard>
                  <ProfileRow
                    icon="bell"
                    label="Notificaciones"
                    onPress={() => navigation.navigate("Notifications")}
                    value={
                      unreadCount === undefined || unreadCount === 0
                        ? undefined
                        : `${unreadCount} sin leer`
                    }
                  />
                </ProfileRowCard>
              </View>
              <View testID="profile-section-account">
                <SectionTitle>Cuenta</SectionTitle>
                <ProfileRowCard>
                  <ProfileRow
                    icon="password"
                    label="Cambiar contraseña"
                    onPress={() => navigation.navigate("ChangePassword")}
                  />
                  {identity.biometrics.available ? <BiometricSwitchRow /> : null}
                  {wide ? null : (
                    <ProfileRow
                      chevron={false}
                      icon="logout"
                      label="Cerrar sesión"
                      onPress={() => setConfirmingLogout(true)}
                    />
                  )}
                </ProfileRowCard>
              </View>
              {/* Walkthrough n.º 16 (C18): help and the studio's pages close Perfil. */}
              <View testID="profile-section-help">
                <SectionTitle>Ayuda y legal</SectionTitle>
                <ProfileRowCard>
                  <ProfileRow
                    icon="message"
                    label="Enviar comentarios"
                    onPress={() => navigation.navigate("Feedback")}
                  />
                  <ProfileRow
                    icon="mail"
                    label="Soporte"
                    onPress={() => openPublicPage("support")}
                  />
                  <ProfileRow
                    icon="shield"
                    label="Política de privacidad"
                    onPress={() => openPublicPage("privacy")}
                  />
                </ProfileRowCard>
              </View>
            </>
          }
        />
        {wide ? null : endBlock}
      </ScrollView>
      {passwordChanged === null ? null : (
        <BrandToast onClose={dismissPasswordChanged} title="Contraseña actualizada" />
      )}
      <LogoutConfirmationSheet
        logout={identity.logout}
        onDismiss={() => setConfirmingLogout(false)}
        visible={confirmingLogout}
      />
    </Screen>
  );
}

// C18: the Plan's state as Mi plan names it.
const planPill = {
  active: "Activo",
  expiring_soon: "Por vencer",
  expired: "Plan vencido",
} as const;

const styles = StyleSheet.create({
  centered: { textAlign: "center" },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  edit: { alignSelf: "center", minHeight: 44, justifyContent: "center" },
  // C18s: the version line on its own white card.
  end: {
    ...surfaces.card,
    alignItems: "center",
    columnGap: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  hero: {
    ...surfaces.emphasis,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.mdLg,
    padding: spacing.xlSm,
  },
  heroBody: { flex: 1, gap: spacing.xxs },
  // 18T: the identity stands centred in the tablet's 300 pt column.
  heroBodyStacked: { alignItems: "center", flex: 0 },
  heroStacked: { flexDirection: "column" },
  screen: { gap: spacing.md },
});
