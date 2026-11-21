import {
  useGetCurrentStaffMemberProfile,
  useGetOwnReferralCode,
  useGetUnreadNotificationCount,
  staffRoleLabel,
} from "@pilates/api-contracts";
import {
  BrandToast,
  IconRow,
  LoadingState,
  LogoutConfirmationSheet,
  QueryFailure,
  Screen,
  spacing,
  surfaces,
  Text,
  useMobileIdentity,
  useStickyNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import appConfig from "../../app.json";
import { useImpersonation } from "../impersonation/impersonation-context";
import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { bodyScroll, RowCard } from "../ui/card-pieces";
import { payPlacement } from "./pay-placement";
import { PayoutQrRow } from "./payout-qr/payout-qr-row";
import { ProfileRow } from "./profile-row";
import { useLastPaymentNote } from "./use-last-payment-note";
import { StaffPhotoSummary } from "./staff-photo-summary";
import { branchesLabel } from "./staff-labels";

type ProfileNavigation = {
  navigate: (
    screen:
      | "Notifications"
      | "PayTab"
      | "MyPay"
      | "ChangePassword"
      | "Feedback"
      | "ReferralCode"
      | "ViewAs"
      | "PayoutQr",
  ) => void;
  setParams: (params: StaffProfileParams) => void;
};

/** What a task that returns to Perfil carries back: «Contraseña actualizada». */
export type StaffProfileParams = { passwordChanged?: true };

/** S23 Perfil, the last tab of every role (follow-up 225 §8). */
export function StaffProfileScreen({ route }: { route: { params?: StaffProfileParams } }) {
  const navigation = useNavigation<ProfileNavigation>();
  const dismissPasswordChanged = () => navigation.setParams({ passwordChanged: undefined });
  const passwordChanged = useStickyNotice(route.params?.passwordChanged, dismissPasswordChanged);
  const identity = useMobileIdentity();
  const { exit, impersonation } = useImpersonation();
  // Walkthrough finding 115: her photo, password, comments, and session stay
  // hers (ADR-0100), so an Administrator seeing the app as her is not offered
  // them, and leaves from here as from the banner.
  const viewingAs = impersonation?.staffMemberName.split(" ")[0] ?? null;
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
  const pay = payPlacement(identity.session?.role);
  const lastPayment = useLastPaymentNote(pay === "profile");
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
      {header}
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        <StaffPhotoSummary
          editable={viewingAs === null}
          member={member}
          note={
            viewingAs !== null
              ? `Mientras ves la app como ${viewingAs}, su foto, su contraseña, sus comentarios y su sesión son solo suyos.`
              : administrator
                ? "Tus datos se editan en la web de administración."
                : "Tu nombre y tu correo los actualiza administración."
          }
        />
        {/* E-F01: each section's label sits inside its white card. */}
        <RowCard label="Tu cuenta">
          <IconRow icon="person" label="Rol" value={staffRoleLabel(member.role, member.gender)} />
          <IconRow
            icon="pin"
            label={singleBranch && member.branches.length === 1 ? "Sucursal" : "Sucursales"}
            value={branchesLabel(member)}
          />
        </RowCard>
        <RowCard label="Ajustes">
          {/* E8 (ADR-0111): everyone who is paid reaches «Mis pagos» from
                here: her tab, or for the Assistant the screen itself. */}
          {pay === "none" ? null : (
            <ProfileRow
              icon="credit"
              label="Mis pagos"
              onPress={() => navigation.navigate(pay === "tab" ? "PayTab" : "MyPay")}
              testID="profile-my-pay"
              value={lastPayment}
            />
          )}
          {/* FIX-072: every role keeps the QR she is paid by. */}
          <PayoutQrRow onPress={() => navigation.navigate("PayoutQr")} />
          {administrator ? (
            <ProfileRow
              icon="eye"
              label="Ver la app como…"
              onPress={() => navigation.navigate("ViewAs")}
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
          {viewingAs === null ? (
            <>
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
                icon="logout"
                label="Cerrar sesión"
                onPress={() => setConfirmingLogout(true)}
                testID="profile-logout"
                tone="error"
              />
            </>
          ) : (
            <ProfileRow
              icon="logout"
              label={`Dejar de ver como ${viewingAs}`}
              onPress={exit}
              testID="profile-stop-viewing"
            />
          )}
        </RowCard>
        <View style={styles.footerCard}>
          <Text style={styles.footer} variant="secundario">
            {`Emma Pilates Studio · versión ${appConfig.expo.version}`}
          </Text>
        </View>
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

const styles = StyleSheet.create({
  footer: { textAlign: "center" },
  // A quiet line goes in a white card, never on the 100 screen.
  footerCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.smLg },
  screen: { paddingHorizontal: spacing.xlSm },
});
