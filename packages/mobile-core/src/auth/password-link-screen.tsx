import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import type { AuthenticationLinkIntent } from "../ingress/verified-link";
import { Text } from "../ui/text";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { AuthenticationScreen, authStyles } from "./auth-layout";
import { FormAlert } from "./auth-parts";
import type { AuthenticationApi } from "./authentication-api";

type LinkState = "activated" | "current" | "expired" | "loading" | "removed";

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
// 21/S19: an expired, used, or removed link draws the Palo de rosa clock.
const deadLinkBadge = { icon: "clock", tone: "primary" } as const;

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
  // A link opened again is checked again from «Comprobando enlace».
  const [checkedIntent, setCheckedIntent] = useState(intent);
  if (checkedIntent !== intent) {
    setCheckedIntent(intent);
    setState("loading");
  }
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

  // FIX-090: the link is checked on every open (each one is a new intent)
  // and whenever the app returns to the front, so a link used meanwhile says
  // so before she types a password, not after.
  useEffect(() => {
    let active = true;
    const expectedPurpose = activation ? "activation" : "password_recovery";

    const inspect = () =>
      void api
        .inspectLink(intent.token)
        .then((result) => {
          if (!active) return;
          if (result.purpose !== undefined && result.purpose !== expectedPurpose) {
            setState("expired");
            return;
          }
          setState((shown) =>
            shown === "activated"
              ? shown
              : result.status === "current" || result.status === "removed"
                ? result.status
                : "expired",
          );
        })
        .catch(() => {
          // A failed re-check (no network on return) keeps what she already saw.
          if (active)
            setState((shown) =>
              shown === "activated" || shown === "current" || shown === "removed"
                ? shown
                : "expired",
            );
        });

    inspect();
    const foreground = AppState.addEventListener?.("change", (appState) => {
      if (appState === "active") inspect();
    });

    return () => {
      active = false;
      foreground?.remove();
    };
  }, [activation, api, intent]);

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
      <AuthenticationScreen staff={audience === "staff"} title="Comprobando enlace">
        <Text variant="cuerpo">Estamos comprobando tu enlace seguro.</Text>
      </AuthenticationScreen>
    );
  }

  const staff = audience === "staff";
  const text = staff ? authStyles.centered : undefined;
  const toLogin = <PrimaryButton label="Ir a iniciar sesión" onPress={onLogin} />;

  if (state === "activated") {
    return (
      <AuthenticationScreen
        actions={toLogin}
        badge={{ icon: "check", tone: "success" }}
        staff={staff}
        title="Tu cuenta está activa"
      >
        <Text variant="cuerpo" style={text}>
          Tu correo quedó verificado. Inicia sesión con tu correo y la contraseña que acabas de
          crear.
        </Text>
      </AuthenticationScreen>
    );
  }

  if (state === "removed") {
    return (
      <AuthenticationScreen
        actions={toLogin}
        badge={deadLinkBadge}
        brand={staff}
        staff={staff}
        title="Esta invitación ya no está activa"
      >
        <Text variant="cuerpo" style={text}>
          {deadLinkCopy[audience].removed}
        </Text>
      </AuthenticationScreen>
    );
  }

  if (state === "expired") {
    return (
      <AuthenticationScreen
        actions={
          activation ? (
            toLogin
          ) : (
            <>
              <PrimaryButton label="Pedir un enlace nuevo" onPress={onRequestRecovery} />
              <TextButton
                label="Volver a iniciar sesión"
                onPress={onLogin}
                style={staff ? undefined : authStyles.pill}
              />
            </>
          )
        }
        badge={deadLinkBadge}
        brand={staff}
        staff={staff}
        title="Este enlace ya no es válido"
      >
        <Text variant="cuerpo" style={text}>
          {activation
            ? deadLinkCopy[audience].expired
            : "Los enlaces para restablecer la contraseña vencen a los 30 minutos y sirven una sola vez. Pide uno nuevo."}
        </Text>
      </AuthenticationScreen>
    );
  }

  // C21 pins the button in a white footer; E-A06 keeps it in the card.
  const save = (
    <PrimaryButton
      busy={isSubmitting}
      disabled={!isValid}
      label={activation ? "Activar cuenta" : "Guardar contraseña"}
      onPress={submit}
    />
  );

  return (
    <AuthenticationScreen
      actions={staff ? save : undefined}
      eyebrow={activation ? "Activar cuenta" : "Restablecer contraseña"}
      footer={staff ? undefined : save}
      staff={staff}
      title={activation ? "Crea tu contraseña" : "Crea una contraseña nueva"}
    >
      <Text variant="cuerpo">
        {activation
          ? "Elegir tu contraseña activa tu cuenta y confirma tu correo. Luego inicias sesión con ella."
          : "Elige una contraseña nueva para tu cuenta."}
      </Text>
      {failed ? <FormAlert>No pudimos guardar la contraseña. Inténtalo de nuevo.</FormAlert> : null}
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
            error={errors.confirmation?.type === "custom" ? errors.confirmation.message : undefined}
            label="Confirmar contraseña"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Repite la contraseña"
            secureTextEntry
            value={value}
          />
        )}
      />
    </AuthenticationScreen>
  );
}
