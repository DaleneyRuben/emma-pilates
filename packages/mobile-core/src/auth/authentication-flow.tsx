import { useEffect, useState, type PropsWithChildren } from "react";
import { StyleSheet, Text } from "react-native";

import type { AuthenticationLinkIntent } from "../ingress/verified-link";
import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { colors, spacing, typography } from "../ui/tokens";
import { AuthenticationScreen } from "./auth-layout";
import type { AuthenticationApi } from "./authentication-api";
import {
  LoginScreen,
  type LoginSubmissionResult,
  type LoginValues,
} from "./login-screen";
import {
  CheckEmailScreen,
  CorrectEmailScreen,
  restartPendingWindow,
  type PendingRegistration,
} from "./pending-registration-screens";
import { PasswordLinkScreen } from "./password-link-screen";
import { RecoveryRequestScreen } from "./recovery-request-screen";
import { RegistrationScreen } from "./registration-screen";

type AuthenticationRoute =
  | "activate"
  | "check-email"
  | "correct-email"
  | "login"
  | "recover"
  | "recovery-request"
  | "register"
  | "verify-email";

type AuthenticationFlowProps = {
  allowClientRegistration?: boolean;
  api: AuthenticationApi;
  intent?: AuthenticationLinkIntent | null;
  notice?: string | null;
  onBiometricUnlock?: () => void;
  onLogin?: (
    values: LoginValues,
  ) => Promise<LoginSubmissionResult | void> | LoginSubmissionResult | void;
  onRecoveryCredential?: (credential: string) => Promise<void> | void;
};

function routeForIntent(
  intent: AuthenticationLinkIntent | null | undefined,
): AuthenticationRoute {
  switch (intent?.type) {
    case "activate-account":
      return "activate";
    case "recover-password":
      return "recover";
    case "verify-email":
      return "verify-email";
    default:
      return "login";
  }
}

function VerifyEmailScreen({
  api,
  onBack,
  token,
}: {
  api: AuthenticationApi;
  onBack: () => void;
  token: string;
}) {
  const [status, setStatus] = useState<"loading" | "verified" | "invalid">(
    "loading",
  );

  useEffect(() => {
    let active = true;

    void api.verifyClientEmail(token).then((result) => {
      if (active) {
        setStatus(result.status === "verified" ? "verified" : "invalid");
      }
    });

    return () => {
      active = false;
    };
  }, [api, token]);

  return (
    <AuthenticationScreen
      title={
        status === "loading"
          ? "Verificando correo"
          : status === "verified"
            ? "Correo verificado"
            : "Enlace no válido"
      }
    >
      <BodyText>
        {status === "loading"
          ? "Estamos verificando tu enlace."
          : status === "verified"
            ? "Tu cuenta está lista. Ahora puedes iniciar sesión."
            : "Este enlace venció o ya fue utilizado."}
      </BodyText>
      {status === "loading" ? null : (
        <PrimaryButton label="Ir a iniciar sesión" onPress={onBack} />
      )}
    </AuthenticationScreen>
  );
}

function ErrorMessage({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

export function AuthenticationFlow({
  allowClientRegistration = true,
  api,
  intent,
  notice = null,
  onBiometricUnlock,
  onLogin,
  onRecoveryCredential = () => undefined,
}: AuthenticationFlowProps) {
  const [route, setRoute] = useState<AuthenticationRoute>(() =>
    routeForIntent(intent),
  );
  const [pending, setPending] = useState<PendingRegistration | null>(null);

  useEffect(() => {
    if (intent !== null && intent !== undefined) {
      setRoute(routeForIntent(intent));
    }
  }, [intent]);

  function showLogin() {
    setRoute("login");
  }

  if (route === "register") {
    return (
      <RegistrationScreen
        api={api}
        onBack={showLogin}
        onRegistered={(registration) => {
          setPending(registration);
          setRoute("check-email");
        }}
      />
    );
  }

  if (route === "check-email" && pending !== null) {
    return (
      <CheckEmailScreen
        api={api}
        onBack={showLogin}
        onCancelled={() => {
          setPending(null);
          showLogin();
        }}
        onCorrect={() => setRoute("correct-email")}
        onRegisterAgain={() => {
          setPending(null);
          setRoute("register");
        }}
        onResent={() => setPending(restartPendingWindow(pending))}
        pending={pending}
      />
    );
  }

  if (route === "correct-email" && pending !== null) {
    return (
      <CorrectEmailScreen
        api={api}
        onBack={() => setRoute("check-email")}
        onCorrected={(corrected) => {
          setPending(corrected);
          setRoute("check-email");
        }}
        pending={pending}
      />
    );
  }

  if (route === "recovery-request") {
    return (
      <RecoveryRequestScreen
        api={api}
        onBack={showLogin}
        teamAccess={!allowClientRegistration}
      />
    );
  }

  if (route === "verify-email" && intent?.type === "verify-email") {
    return (
      <VerifyEmailScreen api={api} onBack={showLogin} token={intent.token} />
    );
  }

  if (
    (route === "activate" && intent?.type === "activate-account") ||
    (route === "recover" && intent?.type === "recover-password")
  ) {
    return (
      <PasswordLinkScreen
        api={api}
        audience={allowClientRegistration ? "client" : "staff"}
        intent={intent}
        onLogin={showLogin}
        onRecovered={onRecoveryCredential}
        onRequestRecovery={() => setRoute("recovery-request")}
      />
    );
  }

  return (
    <LoginScreen
      notice={notice}
      onBiometricUnlock={onBiometricUnlock}
      onForgotPassword={() => setRoute("recovery-request")}
      onRegister={
        allowClientRegistration ? () => setRoute("register") : undefined
      }
      onSubmit={onLogin}
      teamAccess={!allowClientRegistration}
    />
  );
}

const styles = StyleSheet.create({
  emphasized: {
    color: colors.text,
    fontWeight: "600",
  },
  error: {
    color: colors.errorText,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 20,
  },
});
