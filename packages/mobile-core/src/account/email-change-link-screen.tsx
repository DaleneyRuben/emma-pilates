import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { EmailChangeCompletionResultDto } from "@pilates/api-contracts";

import { BodyText } from "../ui/body-text";
import { Heading } from "../ui/heading";
import { PrimaryButton } from "../ui/primary-button";
import { Screen } from "../ui/screen";
import { spacing } from "../ui/tokens";

type Outcome = EmailChangeCompletionResultDto["status"];

const copy: Record<Outcome, { title: string; body: string }> = {
  changed: {
    title: "Tu correo cambió",
    body: "Desde ahora inicia sesión con tu correo nuevo.",
  },
  expired: {
    title: "Enlace vencido",
    body: "Este enlace venció o ya fue utilizado. Pide el cambio de nuevo desde Editar perfil.",
  },
  invalid: {
    title: "Enlace no válido",
    body: "Este enlace no es válido.",
  },
  email_unavailable: {
    title: "Correo no disponible",
    body: "Ese correo ya está en uso. Pide el cambio con otro correo desde Editar perfil.",
  },
};

// Opened from the link sent to the new address (IDN-008), signed in or not:
// completing it needs no session and starts none.
export function EmailChangeLinkScreen({
  api,
  onDone,
  token,
}: {
  api: { completeEmailChange: (token: string) => Promise<{ status: Outcome }> };
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

  return (
    <Screen style={styles.screen}>
      <Heading>{outcome === null ? "Confirmando tu correo" : copy[outcome].title}</Heading>
      <BodyText>
        {outcome === null ? "Estamos confirmando tu enlace." : copy[outcome].body}
      </BodyText>
      {outcome === null ? null : (
        <View style={styles.footer}>
          <PrimaryButton label="Continuar" onPress={() => onDone(outcome === "changed")} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { paddingTop: spacing.lg },
  screen: { gap: spacing.lg },
});
