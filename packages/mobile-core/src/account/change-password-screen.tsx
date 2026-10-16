import { zodResolver } from "@hookform/resolvers/zod";
import { changeCurrentAccountPassword } from "@pilates/api-contracts";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";

import { BodyText } from "../ui/body-text";
import { FormScrollView } from "../ui/form-scroll-view";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { Screen } from "../ui/screen";
import { ScreenTopBar } from "../ui/screen-top-bar";
import { colors, spacing } from "../ui/tokens";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Mínimo 8 caracteres."),
    confirmPassword: z.string().min(1),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

type ChangePasswordScreenProps = {
  fetcher: typeof globalThis.fetch;
  onBack: () => void;
  onSaved: () => void;
};

export function ChangePasswordScreen({ fetcher, onBack, onSaved }: ChangePasswordScreenProps) {
  const [currentPasswordError, setCurrentPasswordError] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
  } = useForm<PasswordValues>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onChange",
    resolver: zodResolver(passwordSchema),
  });

  const save = handleSubmit(async (values) => {
    setCurrentPasswordError(undefined);
    setFailed(false);
    try {
      const response = (await changeCurrentAccountPassword(
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        undefined,
        fetcher,
      )) as { status: number; data: unknown };

      if (response.status === 204) {
        onSaved();
        return;
      }

      const code = (response.data as { code?: string } | null)?.code;
      if (code === "current_password_incorrect") {
        setCurrentPasswordError("La contraseña actual no es correcta.");
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
  });

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={onBack} title="Cambiar contraseña" />
      <FormScrollView
        contentContainerStyle={styles.form}
        footer={
          <View style={styles.footer}>
            <PrimaryButton
              busy={isSubmitting}
              disabled={!isValid}
              label="Guardar contraseña"
              onPress={() => void save()}
            />
          </View>
        }
        keyboardVerticalOffset={spacing.xxl}
      >
        <Controller
          control={control}
          name="currentPassword"
          render={({ field }) => (
            <FormField
              autoCapitalize="none"
              error={currentPasswordError}
              label="Contraseña actual"
              onBlur={field.onBlur}
              onChangeText={(value) => {
                setCurrentPasswordError(undefined);
                field.onChange(value);
              }}
              placeholder="••••••••"
              secureTextEntry
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="newPassword"
          render={({ field }) => (
            <FormField
              autoCapitalize="none"
              error={errors.newPassword?.message}
              label="Contraseña nueva"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="••••••••"
              secureTextEntry
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <FormField
              autoCapitalize="none"
              error={errors.confirmPassword?.message}
              label="Confirmar contraseña"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="••••••••"
              secureTextEntry
              value={field.value}
            />
          )}
        />
        {failed ? (
          <BodyText accessibilityRole="alert" style={styles.failure}>
            No pudimos cambiar la contraseña. Inténtalo de nuevo.
          </BodyText>
        ) : null}
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  failure: { color: colors.errorText },
  footer: { paddingTop: spacing.md },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  screen: { gap: spacing.lg },
});
