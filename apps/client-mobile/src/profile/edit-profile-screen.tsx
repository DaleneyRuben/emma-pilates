import { zodResolver } from "@hookform/resolvers/zod";
import {
  getGetCurrentAccountEmailChangeQueryKey,
  getGetCurrentClientProfileQueryKey,
  requestCurrentAccountEmailChange,
  updateCurrentClientProfile,
  useGetCurrentClientProfile,
  type ClientProfileDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  FormField,
  FormScrollView,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, StyleSheet, View } from "react-native";
import { z } from "zod";

import { useClientFetcher } from "../client-fetcher";
import { EmailChangeSection, normalizeEmail } from "./email-change-section";
import { ProfilePhotoSection } from "./profile-photo-section";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre."),
  email: z.string().trim().email("Escribe un correo válido."),
  phone: z.string(),
});

type ProfileValues = z.infer<typeof profileSchema>;

function EditProfileForm({
  client,
  defaults,
  onSaved,
}: {
  client: ClientProfileDto;
  defaults: ProfileValues;
  onSaved: () => void;
}) {
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<ProfileValues>({
    defaultValues: defaults,
    resolver: zodResolver(profileSchema),
  });

  const save = handleSubmit(async (values) => {
    Keyboard.dismiss();
    setFailed(false);
    const response = await updateCurrentClientProfile(
      {
        name: values.name.trim(),
        phone: values.phone.trim() === "" ? null : values.phone.trim(),
      },
      { headers: { "Content-Type": "application/json" } },
      fetcher,
    );

    if (response.status !== 200) {
      setFailed(true);
      return;
    }
    queryClient.setQueryData(getGetCurrentClientProfileQueryKey(), response);

    // A new address is only asked for (IDN-008): the profile keeps the
    // current one until the link sent to the new mailbox is opened.
    if (normalizeEmail(values.email) === normalizeEmail(client.email)) {
      onSaved();
      return;
    }
    const requested = await requestCurrentAccountEmailChange(
      { email: values.email.trim() },
      { headers: { "Content-Type": "application/json" } },
      fetcher,
    );
    if (requested.status !== 202) {
      setFailed(true);
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: getGetCurrentAccountEmailChangeQueryKey(),
    });
    reset({ ...values, email: client.email });
  });

  return (
    <FormScrollView
      contentContainerStyle={styles.form}
      footer={
        <View style={styles.footer}>
          <PrimaryButton busy={isSubmitting} label="Guardar cambios" onPress={() => void save()} />
        </View>
      }
      keyboardVerticalOffset={spacing.xxl}
    >
      <ProfilePhotoSection client={client} />
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <FormField
            autoCapitalize="words"
            error={errors.name?.message}
            label="Nombre"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormField
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email?.message}
            keyboardType="email-address"
            label="Correo electrónico"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <EmailChangeSection />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <FormField
            keyboardType="phone-pad"
            label="Teléfono"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="+591 7xxxxxxx"
            value={field.value}
          />
        )}
      />
      {failed ? (
        <BodyText accessibilityRole="alert" style={styles.error}>
          No pudimos guardar los cambios. Inténtalo de nuevo.
        </BodyText>
      ) : null}
    </FormScrollView>
  );
}

export function EditProfileScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const profile = useGetCurrentClientProfile({ fetcher });

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Editar perfil" />
    </>
  );

  if (profile.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando perfil" />
      </Screen>
    );
  }

  if (profile.isError || profile.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tu perfil." onRetry={() => void profile.refetch()} />
      </Screen>
    );
  }

  const client = profile.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
      <EditProfileForm
        client={client}
        defaults={{ name: client.name, email: client.email, phone: client.phone ?? "" }}
        onSaved={() => navigation.goBack()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.errorText },
  footer: { paddingTop: spacing.md },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  screen: { gap: spacing.lg },
});
