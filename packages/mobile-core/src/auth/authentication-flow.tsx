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
  RegistrationScreen,
  type PendingRegistration,
} from "./registration-screen";

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

function CheckEmailScreen({
  api,
  onCancel,
  onCorrect,
  pending,
}: {
  api: AuthenticationApi;
  onCancel: () => void;
  onCorrect: () => void;
  pending: PendingRegistration;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function resend() {
    setSubmitting(true);
    await api.resendRegistrationVerification(
      pending.registrationContinuation,
    );
    setNotice("Si el envío está disponible, recibirás un nuevo correo.");
    setSubmitting(false);
  }

  async function cancel() {
    setSubmitting(true);
    await api.cancelRegistration(pending.registrationContinuation);
    onCancel();
  }

  return (
    <AuthenticationScreen title="Revisa tu correo">
      <BodyText>
        Enviamos un enlace de verificación a:
      </BodyText>
      <BodyText style={styles.emphasized}>{pending.email}</BodyText>
      <BodyText>
        Abre el enlace para verificar tu cuenta. No iniciaremos sesión
        automáticamente.
      </BodyText>
      {notice === null ? null : <BodyText>{notice}</BodyText>}
      <TextButton
        disabled={submitting}
        label="Cambiar correo"
        onPress={onCorrect}
      />
      <TextButton
        disabled={submitting}
        label="Reenviar correo"
        onPress={resend}
      />
      <TextButton
        disabled={submitting}
        label="Cancelar registro"
        onPress={cancel}
      />
    </AuthenticationScreen>
  );
}

function CorrectEmailScreen({
  api,
  onBack,
  onCorrected,
  pending,
}: {
  api: AuthenticationApi;
  onBack: () => void;
  onCorrected: (pending: PendingRegistration) => void;
  pending: PendingRegistration;
}) {
  const [email, setEmail] = useState(pending.email);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.includes("@")) {
      return;
    }

    setSubmitting(true);
    const result = await api.correctRegistrationEmail({
      email: email.trim(),
      registrationContinuation: pending.registrationContinuation,
    });
    onCorrected({ ...pending, email: result.email });
  }

  return (
    <AuthenticationScreen title="Cambiar correo">
      <FormField
        autoCapitalize="none"
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        value={email}
      />
      <PrimaryButton
        disabled={submitting}
        label="Guardar correo"
        onPress={submit}
      />
      <TextButton label="Volver" onPress={onBack} />
    </AuthenticationScreen>
  );
}

function RecoveryRequestScreen({
  api,
  onBack,
}: {
  api: AuthenticationApi;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.includes("@")) {
      return;
    }

    setSubmitting(true);
    await api.requestPasswordRecovery(email.trim());
    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <AuthenticationScreen title="Revisa tu correo">
        <BodyText>
          Si existe una cuenta con ese correo, recibirás un enlace para
          restablecer la contraseña. El enlace dura 30 minutos.
        </BodyText>
        <TextButton label="Volver a iniciar sesión" onPress={onBack} />
      </AuthenticationScreen>
    );
  }

  return (
    <AuthenticationScreen title="Recuperar contraseña">
      <BodyText>
        Escribe tu correo y te enviaremos un enlace seguro.
      </BodyText>
      <FormField
        autoCapitalize="none"
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        value={email}
      />
      <PrimaryButton
        disabled={submitting}
        label="Enviar enlace"
        onPress={submit}
      />
      <TextButton label="Volver a iniciar sesión" onPress={onBack} />
    </AuthenticationScreen>
  );
}

function PasswordLinkScreen({
  api,
  intent,
  onActivated,
  onRecovered,
}: {
  api: AuthenticationApi;
  intent: AuthenticationLinkIntent;
  onActivated: () => void;
  onRecovered: (credential: string) => Promise<void> | void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<
    "current" | "invalid" | "loading"
  >("loading");
  const [submitting, setSubmitting] = useState(false);
  const activation = intent.type === "activate-account";
  const title = activation ? "Activar cuenta" : "Restablecer contraseña";

  useEffect(() => {
    let active = true;
    const expectedPurpose = activation ? "activation" : "password_recovery";

    void api
      .inspectLink(intent.token)
      .then((result) => {
        if (active) {
          setInspection(
            result.status === "current" &&
              result.purpose === expectedPurpose
              ? "current"
              : "invalid",
          );
        }
      })
      .catch(() => {
        if (active) {
          setInspection("invalid");
        }
      });

    return () => {
      active = false;
    };
  }, [activation, api, intent.token]);

  async function submit() {
    if (password === "" || password !== confirmation) {
      setError("Las contraseñas deben ser iguales.");
      return;
    }

    setSubmitting(true);
    setError(null);

    if (activation) {
      const result = await api.activateAccount({
        password,
        token: intent.token,
      });

      if (result.status === "activated") {
        onActivated();
        return;
      }
    } else {
      const result = await api.completePasswordRecovery({
        password,
        token: intent.token,
      });

      if (result.status === "recovered" && result.credential !== undefined) {
        await onRecovered(result.credential);
        return;
      }
    }

    setError("Este enlace ya no es válido.");
    setSubmitting(false);
  }

  if (inspection !== "current") {
    return (
      <AuthenticationScreen
        title={
          inspection === "loading" ? "Comprobando enlace" : "Enlace no válido"
        }
      >
        <BodyText>
          {inspection === "loading"
            ? "Estamos comprobando tu enlace seguro."
            : "Este enlace venció o ya fue utilizado."}
        </BodyText>
        {inspection === "invalid" ? (
          <PrimaryButton label="Ir a iniciar sesión" onPress={onActivated} />
        ) : null}
      </AuthenticationScreen>
    );
  }

  return (
    <AuthenticationScreen title={title}>
      <FormField
        label="Nueva contraseña"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <FormField
        label="Confirmar contraseña"
        onChangeText={setConfirmation}
        secureTextEntry
        value={confirmation}
      />
      {error === null ? null : <ErrorMessage>{error}</ErrorMessage>}
      <PrimaryButton disabled={submitting} label={title} onPress={submit} />
    </AuthenticationScreen>
  );
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
        onCancel={showLogin}
        onCorrect={() => setRoute("correct-email")}
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
    return <RecoveryRequestScreen api={api} onBack={showLogin} />;
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
        intent={intent}
        onActivated={showLogin}
        onRecovered={onRecoveryCredential}
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
