import { useEffect, useEffectEvent, useState } from "react";
import { BackHandler } from "react-native";

import type { AuthenticationLinkIntent } from "../ingress/verified-link";
import type { AuthenticationApi } from "./authentication-api";
import {
  type BiometricLock,
  LoginScreen,
  type LoginSubmissionResult,
  type LoginValues,
} from "./login-screen";
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
import { VerifyEmailScreen } from "./verify-email-screen";

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
  biometricLock?: BiometricLock;
  /**
   * Called once a link's screen has used it (verified, invalid, left for
   * Login, or signed in), so the app forgets it (walkthrough n.º 17).
   */
  onIntentHandled?: (intent: AuthenticationLinkIntent) => void;
  onLogin?: (
    values: LoginValues,
  ) => Promise<LoginSubmissionResult | void> | LoginSubmissionResult | void;
  onRecoveryCredential?: (credential: string) => Promise<void> | void;
  /** Keeps «Revisa tu correo» across launches (Client app, MOB-028). */
  pendingRegistrationStore?: PendingRegistrationStore;
  /** A friend's code from the install referrer (n.º 13, CW01b). */
  suggestedReferralCode?: string | null;
  /** iPhone: reads a copied invite code, once (n.º 13, C01b8). */
  readClipboardCode?: () => Promise<string | null>;
};

function routeForIntent(intent: AuthenticationLinkIntent | null | undefined): AuthenticationRoute {
  switch (intent?.type) {
    case "activate-account":
      return "activate";
    case "recover-password":
      return "recover";
    case "verify-email":
      return "verify-email";
    case "referral-invite":
      return "register";
    default:
      return "login";
  }
}

/** Where the Android back button leads; null leaves it to the system. */
function previousRoute(route: AuthenticationRoute): AuthenticationRoute | null {
  if (route === "login") return null;
  return route === "correct-email" ? "check-email" : "login";
}

export function AuthenticationFlow({
  allowClientRegistration = true,
  api,
  intent,
  biometricLock,
  notice = null,
  onIntentHandled,
  onLogin,
  onRecoveryCredential = () => undefined,
  pendingRegistrationStore,
  readClipboardCode,
  suggestedReferralCode = null,
}: AuthenticationFlowProps) {
  const [route, setRoute] = useState<AuthenticationRoute>(() => routeForIntent(intent));
  // C01c2: the flow's own one-time notice over Login, ahead of the app's.
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [resendOnOpen, setResendOnOpen] = useState(false);
  const { pending, restoring, setPending } = usePendingRegistration({
    // A link that arrived while the kept registration was loading keeps its
    // screen; the registration stays stored for a launch without one (MOB-056).
    onRestored: () => setRoute((current) => (current === "login" ? "check-email" : current)),
    restore: intent === null || intent === undefined,
    store: pendingRegistrationStore,
  });

  // A link received while the flow is up opens its screen in the same render
  // (state adjusted when a prop changes, as the React docs prescribe).
  // The flow keeps its own copy, so the screen stays once the app forgets it.
  const [link, setLink] = useState(intent ?? null);
  const [seenIntent, setSeenIntent] = useState(intent);
  if (intent !== seenIntent) {
    setSeenIntent(intent);
    if (intent !== null && intent !== undefined) {
      setLink(intent);
      setRoute(routeForIntent(intent));
    }
  }

  function linkHandled() {
    if (link !== null) onIntentHandled?.(link);
  }

  function showLogin() {
    linkHandled();
    setResendOnOpen(false);
    setRoute("login");
  }

  const leaveForLogin = useEffectEvent(showLogin);

  // The flow switches screens without a navigator, so the Android back button
  // would close the app from every screen past the login (MOB-074).
  useEffect(() => {
    const target = previousRoute(route);
    if (target === null) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (target === "login") leaveForLogin();
      else setRoute(target);
      return true;
    });
    return () => subscription.remove();
  }, [route]);

  // A signed-in Client no longer has a registration to continue, nor a link.
  const login = async (values: LoginValues) => {
    const result = await onLogin?.(values);
    if (result === undefined) {
      setPending(null);
      linkHandled();
    }
    return result;
  };

  const recovered = async (credential: string) => {
    linkHandled();
    await onRecoveryCredential(credential);
  };

  if (restoring) return null;

  if (route === "register") {
    return (
      <RegistrationScreen
        api={api}
        initialReferralCode={link?.type === "referral-invite" ? link.token : suggestedReferralCode}
        onBack={showLogin}
        readClipboardCode={readClipboardCode}
        onRegistered={(registration) => {
          linkHandled();
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
        onConfirmed={() => {
          setPending(null);
          setLoginNotice("Tu correo ya está confirmado. Inicia sesión para entrar.");
          showLogin();
        }}
        onCorrect={() => {
          setResendOnOpen(false);
          setRoute("correct-email");
        }}
        onRegisterAgain={() => {
          setPending(null);
          setRoute("register");
        }}
        onResent={() => {
          setResendOnOpen(false);
          setPending(restartPendingWindow(pending));
        }}
        pending={pending}
        resendOnOpen={resendOnOpen}
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

  if (route === "verify-email" && link?.type === "verify-email") {
    return (
      <VerifyEmailScreen
        api={api}
        onBack={showLogin}
        onSettled={linkHandled}
        onVerified={() => setPending(null)}
        token={link.token}
      />
    );
  }

  if (
    (route === "activate" && link?.type === "activate-account") ||
    (route === "recover" && link?.type === "recover-password")
  ) {
    return (
      <PasswordLinkScreen
        api={api}
        audience={allowClientRegistration ? "client" : "staff"}
        intent={link}
        onLogin={showLogin}
        onRecovered={recovered}
        onRequestRecovery={() => {
          linkHandled();
          setRoute("recovery-request");
        }}
      />
    );
  }

  return (
    <LoginScreen
      biometricLock={biometricLock}
      notice={loginNotice ?? notice}
      onResendConfirmation={() => {
        setResendOnOpen(true);
        setRoute("check-email");
      }}
      onForgotPassword={() => setRoute("recovery-request")}
      onRegister={allowClientRegistration ? () => setRoute("register") : undefined}
      onSubmit={onLogin === undefined ? undefined : login}
      teamAccess={!allowClientRegistration}
      unconfirmedEmail={pending?.email ?? null}
    />
  );
}
