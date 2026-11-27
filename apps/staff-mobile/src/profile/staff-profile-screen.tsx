import {
  useGetCurrentStaffMemberProfile,
  useGetOwnReferralCode,
  useGetUnreadNotificationCount,
  staffRoleLabel,
} from "@pilates/api-contracts";
import {
  appVersionLabel,
  BiometricSwitchRow,
  BrandToast,
  LoadingState,
  LogoutCard,
  LogoutConfirmationSheet,
  openPublicPage,
  ProfileFooter,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  useMobileIdentity,
  useStickyNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
      | "Comments"
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
  // Follow-up 293 (E-F01–E-F05, E-F29–E-F32): her Role and Branches are
  // facts, so they sit under her name instead of in a group of their own.
  const branches = branchesLabel(member);
  const role = staffRoleLabel(member.role, member.gender);
  const roleLine = branches === "" ? role : `${role} · ${branches}`;

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
          roleLine={roleLine}
        />
        {/* Follow-up 293: no group holds a single row. Her work group first:
            the Administrator's «Administración», everyone else's «Tus pagos». */}
        {administrator ? (
          <View testID="profile-group-admin">
            <SectionTitle>Administración</SectionTitle>
            <RowCard>
              <ProfileRow
                icon="eye"
                label="Ver la app como…"
                onPress={() => navigation.navigate("ViewAs")}
              />
              {/* Walkthrough n.º 11 (E-F18): the comments, read from the phone. */}
              <ProfileRow
                icon="message"
                label="Comentarios de clientas"
                onPress={() => navigation.navigate("Comments")}
              />
              {/* FIX-072: every role keeps the QR she is paid by. */}
              <PayoutQrRow onPress={() => navigation.navigate("PayoutQr")} />
            </RowCard>
          </View>
        ) : (
          <View testID="profile-group-pay">
            <SectionTitle>Tus pagos</SectionTitle>
            <RowCard>
              {/* E8 (ADR-0111): everyone who is paid reaches her pay from
                  here: her tab, or for the Assistant the screen itself. */}
              {pay === "none" ? null : (
                <ProfileRow
                  icon="credit"
                  label="Historial de pagos"
                  onPress={() => navigation.navigate(pay === "tab" ? "PayTab" : "MyPay")}
                  testID="profile-my-pay"
                  value={lastPayment}
                />
              )}
              <PayoutQrRow onPress={() => navigation.navigate("PayoutQr")} />
              {trainer && referralCode !== null ? (
                <ProfileRow
                  icon="tag"
                  label="Tu código de referido"
                  onPress={() => navigation.navigate("ReferralCode")}
                  value={referralCode}
                />
              ) : null}
            </RowCard>
          </View>
        )}
        <View testID="profile-group-settings">
          <SectionTitle>Ajustes</SectionTitle>
          <RowCard>
            <ProfileRow
              badge={unreadCount}
              icon="bell"
              label="Notificaciones"
              onPress={() => navigation.navigate("Notifications")}
            />
            {/* One child per row: RowCard draws a hairline between its children. */}
            {viewingAs === null ? (
              <ProfileRow
                icon="password"
                label="Cambiar contraseña"
                onPress={() => navigation.navigate("ChangePassword")}
              />
            ) : (
              <ProfileRow
                icon="logout"
                label={`Dejar de ver como ${viewingAs}`}
                onPress={exit}
                testID="profile-stop-viewing"
              />
            )}
            {viewingAs === null && identity.biometrics.available ? <BiometricSwitchRow /> : null}
          </RowCard>
        </View>
        {/* The Administrator owns the studio, so she has no «Ayuda». While she
            sees the app as someone, the feedback is that person's, and
            «Preguntas frecuentes» alone would be a single row (E-D26). */}
        {administrator || viewingAs !== null ? null : (
          <View testID="profile-group-help">
            <SectionTitle>Ayuda</SectionTitle>
            <RowCard>
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
            </RowCard>
          </View>
        )}
        {/* Follow-up 292 (E-F23, E-F28): «Cerrar sesión» on a card of its own.
            Her session is hers, so an Administrator seeing the app as her
            leaves from «Ajustes» instead. */}
        {viewingAs === null ? (
          <LogoutCard
            onPress={() => setConfirmingLogout(true)}
            screenGap={bodyScroll.content.gap}
          />
        ) : null}
        {/* Follow-up 293 (E-F24): the footer, 16 pt under «Cerrar sesión», or
            28 pt under «Ajustes» while seeing the app as someone (E-D26). */}
        <ProfileFooter
          links={[
            {
              label: "Política de privacidad",
              onPress: () => openPublicPage("privacy"),
              testID: "profile-privacy",
            },
          ]}
          screenGap={
            viewingAs === null ? bodyScroll.content.gap : bodyScroll.content.gap - spacing.md
          }
          version={appVersionLabel()}
        />
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
  // Walkthrough n.º 8: the band, titles and cards on one 16 pt edge.
  screen: { paddingHorizontal: spacing.lg },
});
