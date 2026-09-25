import {
  cancelCurrentAccountEmailChange,
  getGetCurrentAccountEmailChangeQueryKey,
  resendCurrentAccountEmailChange,
  useGetCurrentAccountEmailChange,
} from "@pilates/api-contracts";
import { BodyText, colors, radii, spacing, TextButton, typography } from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";

// IDN-008 on Client 22: the pending email change with its resend and cancel;
// the current address stays the login until the link in the new mailbox is
// opened (proposal E2, E6).
export function EmailChangeSection() {
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const state = useGetCurrentAccountEmailChange({ fetcher });
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending =
    state.data?.status === 200 ? (state.data.data.pending ?? null) : null;

  if (pending === null) return null;

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: getGetCurrentAccountEmailChangeQueryKey(),
    });

  const resend = async () => {
    setBusy(true);
    setNotice(null);
    const response = await resendCurrentAccountEmailChange(undefined, fetcher);
    setBusy(false);
    setNotice(
      response.status === 202
        ? "Te enviamos otro enlace."
        : "No pudimos reenviar el correo. Inténtalo de nuevo.",
    );
  };

  const cancel = async () => {
    setBusy(true);
    setNotice(null);
    const response = await cancelCurrentAccountEmailChange(undefined, fetcher);
    setBusy(false);
    if (response.status !== 204) {
      setNotice("No pudimos cancelar el cambio. Inténtalo de nuevo.");
      return;
    }
    await refresh();
  };

  return (
    <View accessibilityLabel="Cambio de correo pendiente" style={styles.card}>
      <Text style={styles.title}>Revisa tu correo nuevo</Text>
      <BodyText>
        Te enviamos un enlace a {pending.email}. Ábrelo dentro de 24 horas para
        confirmar el cambio; hasta entonces sigues entrando con tu correo actual.
      </BodyText>
      <View style={styles.actions}>
        <TextButton disabled={busy} label="Reenviar correo" onPress={() => void resend()} />
        <TextButton disabled={busy} label="Cancelar cambio" onPress={() => void cancel()} />
      </View>
      {notice === null ? null : <BodyText style={styles.notice}>{notice}</BodyText>}
    </View>
  );
}

// Normalized like the API does, so an unchanged address never sends a request.
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.md },
  card: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  notice: { color: colors.textMuted, fontSize: typography.note },
  title: { color: colors.primaryDeep, fontSize: typography.bodyLarge, fontWeight: "500" },
});
