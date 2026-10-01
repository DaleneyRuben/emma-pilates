import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import type { AuthenticationLinkIntent } from "../ingress/verified-link";
import { BodyText } from "../ui/body-text";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { AuthenticationScreen } from "./auth-layout";
import { FormAlert } from "./auth-parts";
import type { AuthenticationApi } from "./authentication-api";

type LinkState =
  | "activated"
  | "current"
  | "expired"
  | "loading"
  | "removed";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres."),
    confirmation: z.string().min(1),
  })
  .refine((values) => values.password === values.confirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmation"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

// The Client app sends people to the studio; the Staff app to administración.
const deadLinkCopy = {
  client: {
    expired:
      "Las invitaciones vencen a los 7 días y sirven una sola vez. Pide en el estudio que te envíen una nueva.",
    removed:
      "Pasaron 30 días sin activarla, así que se eliminó. Para tener una cuenta, el estudio tiene que crear una invitación nueva.",
  },
  staff: {
    expired:
      "Las invitaciones vencen a los 7 días y sirven una sola vez. Pide a administración que te envíe una nueva.",
    removed:
      "Pasaron 30 días sin activarla, así que se eliminó. Para tener una cuenta, administración tiene que crear una invitación nueva.",
  },
} as const;

/** 21 and S19: the page an activation or recovery link opens, without a session. */
export function PasswordLinkScreen({
  api,
  audience,
  intent,
  onLogin,
  onRecovered,
  onRequestRecovery,
}: {
  api: AuthenticationApi;
  audience: "client" | "staff";
  intent: AuthenticationLinkIntent;
  onLogin: () => void;
  onRecovered: (credential: string) => Promise<void> | void;
  onRequestRecovery: () => void;
}) {
  const activation = intent.type === "activate-account";
  const [state, setState] = useState<LinkState>("loading");
  const [failed, setFailed] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
  } = useForm<PasswordValues>({
    defaultValues: { confirmation: "", password: "" },
    mode: "onChange",
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    let active = true;
    const expectedPurpose = activation ? "activation" : "password_recovery";

    void api
      .inspectLink(intent.token)
      .then((result) => {
        if (!active) return;
        if (result.purpose !== undefined && result.purpose !== expectedPurpose) {
          setState("expired");
          return;
        }
        setState(
          result.status === "current" || result.status === "removed"
            ? result.status
            : "expired",
        );
      })
      .catch(() => {
        if (active) setState("expired");
      });

    return () => {
      active = false;
    };
  }, [activation, api, intent.token]);

  const submit = handleSubmit(async ({ password }) => {
    setFailed(false);

    try {
      if (activation) {
        const result = await api.activateAccount({ password, token: intent.token });
        setState(result.status === "activated" ? "activated" : "expired");
        return;
      }

      const result = await api.completePasswordRecovery({
        password,
        token: intent.token,
      });

      if (result.status === "recovered" && result.credential !== undefined) {
        await onRecovered(result.credential);
        return;
      }
      setState("expired");
    } catch {
      setFailed(true);
    }
  });

  if (state === "loading") {
    return (
      <AuthenticationScreen title="Comprobando enlace">
        <BodyText>Estamos comprobando tu enlace seguro.</BodyText>
      </AuthenticationScreen>
    );
  }

  if (state === "activated") {
    return (
      <AuthenticationScreen title="Tu cuenta está activa">
        <BodyText>
          Tu correo quedó verificado. Inicia sesión con tu correo y la
          contraseña que acabas de crear.
        </BodyText>
        <PrimaryButton label="Ir a iniciar sesión" onPress={onLogin} />
      </AuthenticationScreen>
    );
  }

  if (state === "removed") {
    return (
      <AuthenticationScreen title="Esta invitación ya no está activa">
        <BodyText>{deadLinkCopy[audience].removed}</BodyText>
        <PrimaryButton label="Ir a iniciar sesión" onPress={onLogin} />
      </AuthenticationScreen>
    );
  }

  if (state === "expired") {
    return (
      <AuthenticationScreen title="Este enlace ya no es válido">
        {activation ? (
          <>
            <BodyText>{deadLinkCopy[audience].expired}</BodyText>
            <PrimaryButton label="Ir a iniciar sesión" onPress={onLogin} />
          </>
        ) : (
          <>
            <BodyText>
              Los enlaces para restablecer la contraseña vencen a los 30
              minutos y sirven una sola vez. Pide uno nuevo.
            </BodyText>
            <PrimaryButton
              label="Pedir un enlace nuevo"
              onPress={onRequestRecovery}
            />
            <TextButton label="Volver a iniciar sesión" onPress={onLogin} />
          </>
        )}
      </AuthenticationScreen>
    );
  }

  return (
    <AuthenticationScreen
      eyebrow={activation ? "Activar cuenta" : "Restablecer contraseña"}
      title={activation ? "Crea tu contraseña" : "Crea una contraseña nueva"}
    >
      <BodyText>
        {activation
          ? "Elegir tu contraseña activa tu cuenta y confirma tu correo. Luego inicias sesión con ella."
          : "Elige una contraseña nueva para tu cuenta."}
      </BodyText>
      {failed ? (
        <FormAlert>No pudimos guardar la contraseña. Inténtalo de nuevo.</FormAlert>
      ) : null}
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            autoComplete="new-password"
            error={errors.password?.message}
            label="Contraseña nueva"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmation"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            autoComplete="new-password"
            error={
              errors.confirmation?.type === "custom"
                ? errors.confirmation.message
                : undefined
            }
            label="Confirmar contraseña"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Repite la contraseña"
            secureTextEntry
            value={value}
          />
        )}
      />
      <PrimaryButton
        disabled={!isValid || isSubmitting}
        label={activation ? "Activar cuenta" : "Guardar contraseña"}
        onPress={submit}
      />
    </AuthenticationScreen>
  );
}
