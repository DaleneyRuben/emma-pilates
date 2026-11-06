import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { EmailChangeCompletionResultDto } from "@pilates/api-contracts";

import { AuthenticationScreen, authStyles } from "../auth/auth-layout";
import { BodyText } from "../ui/body-text";
import type { OutcomeBadgeProps } from "../ui/outcome-badge";
import { PrimaryButton } from "../ui/primary-button";
import { spacing } from "../ui/tokens";

type Outcome = EmailChangeCompletionResultDto["status"];

const copy: Record<Outcome, { badge: OutcomeBadgeProps; title: string; body: string }> = {
  changed: {
    badge: { icon: "check", tone: "success" },
    title: "Tu correo cambió",
    body: "Desde ahora inicia sesión con tu correo nuevo.",
  },
  expired: {
    badge: { icon: "clock", tone: "primary" },
    title: "Enlace vencido",
    body: "Este enlace venció o ya fue utilizado. Pide el cambio de nuevo desde Editar perfil.",
  },
  invalid: {
    badge: { icon: "blocked", tone: "primary" },
    title: "Enlace no válido",
    body: "Este enlace no es válido.",
  },
  email_unavailable: {
    badge: { icon: "at", tone: "primary" },
    title: "Correo no disponible",
    body: "Ese correo ya está en uso. Pide el cambio con otro correo desde Editar perfil.",
  },
};

// FIX-039 (DES-012): a Staff Member's change was asked by the studio.
const staffCopy: Record<Outcome, { badge: OutcomeBadgeProps; title: string; body: string }> = {
  changed: {
    badge: { icon: "check", tone: "success" },
    title: "Correo confirmado",
    body: "Desde ahora entras con tu correo nuevo. Tu contraseña no cambió.",
  },
  expired: {
    badge: { icon: "clock", tone: "primary" },
    title: "El enlace ya no sirve",
    body: "Este enlace venció o ya no sirve. Pide en el estudio que te envíen otro; mientras tanto sigues entrando con tu correo anterior.",
  },
  invalid: copy.invalid,
  email_unavailable: {
    badge: { icon: "at", tone: "primary" },
    title: "No pudimos cambiar el correo",
    body: "Ese correo ya lo usa otra cuenta, así que no lo cambiamos. Habla con el estudio.",
  },
};

const confirming = {
  badge: { icon: "mail", tone: "primary" },
  title: "Confirmando tu correo",
  body: "Estamos confirmando tu enlace.",
} as const;

// Opened from the link sent to the new address (IDN-008), signed in or not:
// completing it needs no session and starts none.
export function EmailChangeLinkScreen({
  api,
  audience = "client",
  onDone,
  token,
}: {
  api: { completeEmailChange: (token: string) => Promise<{ status: Outcome }> };
  /** «staff» when the studio asked for the change (FIX-039). */
  audience?: "client" | "staff";
  onDone: (changed: boolean) => void;
  token: string;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let active = true;
    api
      .completeEmailChange(token)
      .then((result) => {
        if (active) setOutcome(result.status);
      })
      .catch(() => {
        if (active) setOutcome("invalid");
      });
    return () => {
      active = false;
    };
  }, [api, token]);

  const shown = outcome === null ? confirming : (audience === "staff" ? staffCopy : copy)[outcome];

  return (
    <AuthenticationScreen badge={shown.badge} title={shown.title}>
      <BodyText style={authStyles.centered}>{shown.body}</BodyText>
      {outcome === null ? null : (
        <View style={styles.footer}>
          <PrimaryButton label="Continuar" onPress={() => onDone(outcome === "changed")} />
        </View>
      )}
    </AuthenticationScreen>
  );
}

const styles = StyleSheet.create({
  footer: { paddingTop: spacing.lg },
});
