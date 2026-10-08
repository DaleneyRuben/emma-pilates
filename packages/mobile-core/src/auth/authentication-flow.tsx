import { useEffect, useEffectEvent, useState } from "react";

import type { AuthenticationLinkIntent } from "../ingress/verified-link";
import { BodyText } from "../ui/body-text";
import { PrimaryButton } from "../ui/primary-button";
import { AuthenticationScreen } from "./auth-layout";
import type { AuthenticationApi } from "./authentication-api";
import { LoginScreen, type LoginSubmissionResult, type LoginValues } from "./login-screen";
import {
  CheckEmailScreen,
  CorrectEmailScreen,
  restartPendingWindow,
} from "./pending-registration-screens";
import type { PendingRegistrationStore } from "./pending-registration-store";
import { PasswordLinkScreen } from "./password-link-screen";
import { RecoveryRequestScreen } from "./recovery-request-screen";
import { RegistrationScreen } from "./registration-screen";
import { usePendingRegistration } from "./use-pending-registration";

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
  /** Keeps «Revisa tu correo» across launches (Client app, MOB-028). */
  pendingRegistrationStore?: PendingRegistrationStore;
};

function routeForIntent(intent: AuthenticationLinkIntent | null | undefined): AuthenticationRoute {
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
  onVerified,
  token,
}: {
  api: AuthenticationApi;
  onBack: () => void;
  onVerified: () => void;
  token: string;
}) {
  const [status, setStatus] = useState<"loading" | "verified" | "invalid">("loading");
  // The token is consumed by its first use: the verification follows the api
  // and the token, never the parent's latest `onVerified` closure.
  const verified = useEffectEvent(onVerified);

  useEffect(() => {
    let active = true;

    void api.verifyClientEmail(token).then((result) => {
      if (active) {
        setStatus(result.status === "verified" ? "verified" : "invalid");
        if (result.status === "verified") verified();
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
      {status === "loading" ? null : <PrimaryButton label="Ir a iniciar sesión" onPress={onBack} />}
    </AuthenticationScreen>
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
  pendingRegistrationStore,
}: AuthenticationFlowProps) {
  const [route, setRoute] = useState<AuthenticationRoute>(() => routeForIntent(intent));
  const { pending, restoring, setPending } = usePendingRegistration({
    // A link that arrived while the kept registration was loading keeps its
    // screen; the registration stays stored for a launch without one (MOB-056).
    onRestored: () => setRoute((current) => (current === "login" ? "check-email" : current)),
    restore: intent === null || intent === undefined,
    store: pendingRegistrationStore,
  });

  // A link received while the flow is up opens its screen in the same render
  // (state adjusted when a prop changes, as the React docs prescribe).
  const [seenIntent, setSeenIntent] = useState(intent);
  if (intent !== seenIntent) {
    setSeenIntent(intent);
    if (intent !== null && intent !== undefined) {
      setRoute(routeForIntent(intent));
    }
  }

  function showLogin() {
    setRoute("login");
  }

  // A signed-in Client no longer has a registration to continue.
  const login = async (values: LoginValues) => {
    const result = await onLogin?.(values);
    if (result === undefined) setPending(null);
    return result;
  };

  if (restoring) return null;

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
      <RecoveryRequestScreen api={api} onBack={showLogin} teamAccess={!allowClientRegistration} />
    );
  }

  if (route === "verify-email" && intent?.type === "verify-email") {
    return (
      <VerifyEmailScreen
        api={api}
        onBack={showLogin}
        onVerified={() => setPending(null)}
        token={intent.token}
      />
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
      onRegister={allowClientRegistration ? () => setRoute("register") : undefined}
      onSubmit={onLogin === undefined ? undefined : login}
      teamAccess={!allowClientRegistration}
    />
  );
}
