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
  LogoutCard,
  LogoutConfirmationSheet,
  openPublicPage,
  OutlinedButton,
  ProfileFooter,
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

  // Follow-up 293 (C18s): two quiet lines straight on the page, the version
  // and the links; «Cerrar mi cuenta» still opens C24.
  const footer = (screenGap: number) => (
    <ProfileFooter
      links={[
        {
          label: "Política de privacidad",
          onPress: () => openPublicPage("privacy"),
          testID: "profile-privacy",
        },
        {
          label: "Cerrar mi cuenta",
          onPress: () => navigation.navigate("CloseAccount"),
          testID: "profile-close-account",
        },
      ]}
      screenGap={screenGap}
      version={appVersionLabel()}
    />
  );

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {/* 18T: on a tablet the identity, «Cerrar sesión» and the footer sit
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
                  {footer(spacing.md)}
                </>
              ) : null}
            </>
          }
          leftWidth={300}
          right={
            <>
              {/* Follow-up 293 (C18): no group holds a single row. */}
              <View testID="profile-group-plan">
                <SectionTitle>Tu plan</SectionTitle>
                <ProfileRowCard>
                  <ProfileRow
                    icon="card"
                    label="Plan actual"
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
                    icon="personAdd"
                    label="Invita a una amiga"
                    onPress={() => navigation.navigate("Referrals")}
                  />
                  <ProfileRow
                    icon="document"
                    label="Facturas"
                    onPress={() => navigation.navigate("MyInvoices")}
                  />
                </ProfileRowCard>
              </View>
              <View testID="profile-group-settings">
                <SectionTitle>Ajustes</SectionTitle>
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
                  <ProfileRow
                    icon="password"
                    label="Cambiar contraseña"
                    onPress={() => navigation.navigate("ChangePassword")}
                  />
                  {identity.biometrics.available ? <BiometricSwitchRow /> : null}
                </ProfileRowCard>
              </View>
              <View testID="profile-group-help">
                <SectionTitle>Ayuda</SectionTitle>
                <ProfileRowCard>
                  <ProfileRow
                    icon="message"
                    label="Envíanos tu opinión"
                    onPress={() => navigation.navigate("Feedback")}
                  />
                  <ProfileRow
                    icon="mail"
                    label="Preguntas frecuentes"
                    onPress={() => openPublicPage("support")}
                  />
                </ProfileRowCard>
              </View>
            </>
          }
        />
        {/* Follow-up 292 (C18s): «Cerrar sesión» closes the screen on a card
            of its own; follow-up 293's footer sits under it. */}
        {wide ? null : <LogoutCard onPress={() => setConfirmingLogout(true)} />}
        {wide ? null : footer(spacing.md)}
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
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  edit: { alignSelf: "center", minHeight: 44, justifyContent: "center" },
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
