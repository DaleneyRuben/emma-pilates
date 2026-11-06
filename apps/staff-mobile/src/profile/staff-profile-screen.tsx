import {
  useGetCurrentStaffMemberProfile,
  useGetOwnReferralCode,
  useGetUnreadNotificationCount,
} from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  IconRow,
  IconRowGroup,
  LoadingState,
  LogoutConfirmationSheet,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  typography,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import appConfig from "../../app.json";
import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { ProfileRow } from "./profile-row";
import { StaffPhotoSummary } from "./staff-photo-summary";
import { branchesLabel, roleLabel } from "./staff-labels";

type ProfileNavigation = {
  navigate: (
    screen: "Notifications" | "PayTab" | "ChangePassword" | "Feedback" | "ReferralCode" | "ViewAs",
  ) => void;
};

/** S23 Perfil, the last tab of every role (follow-up 225 §8). */
export function StaffProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const identity = useMobileIdentity();
  const fetcher = useStaffFetcher();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const profile = useGetCurrentStaffMemberProfile({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const unread = useGetUnreadNotificationCount({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const trainer = identity.session?.role === "trainer";
  // BKM-017: only a Trainer has a code of her own (follow-up 229).
  const ownCode = useGetOwnReferralCode({
    fetcher,
    query: { enabled: trainer, refetchOnMount: "always" },
  });
  const referralCode = ownCode.data?.status === 200 ? ownCode.data.data.referralCode : null;
  const unreadCount = unread.data?.status === 200 ? unread.data.data.unread : 0;
  const header = <RootHeader title="Perfil" />;

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
  const administrator = identity.session?.role === "administrator";
  const singleBranch = member.role !== "administrator" && member.role !== "coordinator";

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        <StaffPhotoSummary
          member={member}
          note={
            administrator
              ? "Tus datos se editan en la web de administración."
              : "Tu nombre y tu correo los actualiza administración."
          }
        />
        <View>
          <SectionTitle>Tu cuenta</SectionTitle>
          <IconRowGroup>
            <IconRow icon="person" label="Rol" value={roleLabel(member.role)} />
            <IconRow
              icon="pin"
              label={singleBranch && member.branches.length === 1 ? "Sucursal" : "Sucursales"}
              value={branchesLabel(member)}
            />
          </IconRowGroup>
        </View>
        <View>
          <SectionTitle>Ajustes</SectionTitle>
          <IconRowGroup>
            {administrator ? (
              <ProfileRow
                icon="eye"
                label="Ver la app como…"
                onPress={() => navigation.navigate("ViewAs")}
              />
            ) : null}
            {trainer ? (
              <ProfileRow
                icon="credit"
                label="Mis pagos"
                onPress={() => navigation.navigate("PayTab")}
              />
            ) : null}
            {trainer && referralCode !== null ? (
              <ProfileRow
                icon="tag"
                label="Tu código de referido"
                onPress={() => navigation.navigate("ReferralCode")}
                value={referralCode}
              />
            ) : null}
            <ProfileRow
              badge={unreadCount}
              icon="bell"
              label="Notificaciones"
              onPress={() => navigation.navigate("Notifications")}
            />
            <ProfileRow
              icon="lock"
              label="Cambiar contraseña"
              onPress={() => navigation.navigate("ChangePassword")}
            />
            <ProfileRow
              icon="message"
              label="Enviar comentarios"
              onPress={() => navigation.navigate("Feedback")}
            />
            <ProfileRow
              icon="cross"
              label="Cerrar sesión"
              onPress={() => setConfirmingLogout(true)}
              testID="profile-logout"
              tone="error"
            />
          </IconRowGroup>
          <Text style={styles.footer}>
            {`Emma Pilates Studio · versión ${appConfig.expo.version}`}
          </Text>
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

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  footer: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.label,
    marginTop: spacing.md,
    textAlign: "center",
  },
  screen: { paddingHorizontal: spacing.xlSm },
});
