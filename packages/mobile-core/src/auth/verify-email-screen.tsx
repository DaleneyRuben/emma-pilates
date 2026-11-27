import { useEffect, useEffectEvent, useState } from "react";
import { StyleSheet } from "react-native";

import { footerEdges } from "../ui/footer-panel";
import { OutlinedButton } from "../ui/outlined-button";
import { PrimaryButton } from "../ui/primary-button";
import { Screen } from "../ui/screen";
import { StatusLayout } from "../ui/status-layout";
import { colors } from "../ui/tokens";
import type { AuthenticationApi } from "./authentication-api";

type VerificationState = "loading" | "verified" | "invalid" | "used" | "failed";

const outcome = {
  failed: {
    icon: "mail",
    line: "Revisa tu conexión e inténtalo de nuevo.",
    title: "No pudimos verificar tu enlace",
  },
  invalid: {
    icon: "mail",
    line: "Este enlace venció o ya fue utilizado.",
    title: "Enlace no válido",
  },
  // After a failed try the server may have verified and lost its answer, so
  // a used link then reads as possibly already verified (review).
  used: {
    icon: "mail",
    line: "Si ya verificaste tu correo, puedes iniciar sesión.",
    title: "Enlace ya utilizado",
  },
  loading: {
    icon: "mail",
    line: "Estamos verificando tu enlace.",
    title: "Verificando correo",
  },
  verified: {
    icon: "check",
    line: "Tu cuenta está lista. Ahora puedes iniciar sesión.",
    title: "Correo verificado",
  },
} as const;

/**
 * C01k, C01k2, C01k3 (walkthrough n.º 3 and 8): the payment status layout,
 * the outcome on the band, its line in a card, the buttons on the footer.
 * A failed request (no network, a server error, the timeout) offers a retry
 * instead of waiting for ever (walkthrough n.º 3); the server answers a
 * second use of the token as «invalid», never verifying it twice.
 */
export function VerifyEmailScreen({
  api,
  onBack,
  onSettled,
  onVerified,
  token,
}: {
  api: Pick<AuthenticationApi, "verifyClientEmail">;
  onBack: () => void;
  /** The link has been used, verified or not: the app can forget it (n.º 17). */
  onSettled: () => void;
  onVerified: () => void;
  token: string;
}) {
  const [state, setState] = useState<VerificationState>("loading");
  const [attempt, setAttempt] = useState(0);
  // The token is consumed by its first use: the verification follows the api,
  // the token and the retries, never the parent's latest closures.
  const verified = useEffectEvent(onVerified);
  const settled = useEffectEvent(onSettled);

  useEffect(() => {
    let active = true;

    api
      .verifyClientEmail(token)
      .then((result) => {
        if (!active) return;
        setState(result.status === "verified" ? "verified" : attempt > 0 ? "used" : "invalid");
        if (result.status === "verified") verified();
        settled();
      })
      .catch(() => {
        if (active) setState("failed");
      });

    return () => {
      active = false;
    };
  }, [api, attempt, token]);

  const shown = outcome[state];

  return (
    <Screen edges={footerEdges} style={styles.screen}>
      <StatusLayout
        actions={
          state === "loading" ? null : state === "failed" ? (
            <>
              <PrimaryButton
                label="Reintentar"
                onPress={() => {
                  setState("loading");
                  setAttempt((current) => current + 1);
                }}
              />
              <OutlinedButton label="Ir a iniciar sesión" onPress={onBack} />
            </>
          ) : (
            <PrimaryButton label="Ir a iniciar sesión" onPress={onBack} />
          )
        }
        icon={shown.icon}
        note={shown.line}
        title={shown.title}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, paddingBottom: 0 },
});
