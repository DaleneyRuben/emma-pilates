import { zodResolver } from "@hookform/resolvers/zod";
import {
  getGetCurrentClientProfileQueryKey,
  updateCurrentClientProfile,
  useGetCurrentClientProfile,
  type ClientProfileDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  FormField,
  Heading,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { z } from "zod";

import { useClientFetcher } from "../client-fetcher";
import { BackLink } from "@pilates/mobile-core";
import { ProfilePhotoSection } from "./profile-photo-section";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre."),
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
  const email = client.email;
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<ProfileValues>({
    defaultValues: defaults,
    resolver: zodResolver(profileSchema),
  });

  const save = handleSubmit(async (values) => {
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
    onSaved();
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={spacing.xxl}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
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
        <FormField editable={false} label="Correo electrónico" value={email} />
        <BodyText style={styles.note}>
          Para cambiar tu correo, escríbenos al estudio.
        </BodyText>
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
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          disabled={isSubmitting}
          label="Guardar cambios"
          onPress={() => void save()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

export function EditProfileScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const profile = useGetCurrentClientProfile({ fetcher });

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Editar perfil">Editar perfil</Heading>
    </>
  );

  if (profile.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando perfil">Cargando…</BodyText>
      </Screen>
    );
  }

  if (profile.isError || profile.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tu perfil."
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  const client = profile.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
      <EditProfileForm
        client={client}
        defaults={{ name: client.name, phone: client.phone ?? "" }}
        onSaved={() => navigation.goBack()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.errorText },
  flex: { flex: 1 },
  footer: { paddingTop: spacing.md },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  note: { color: colors.textMuted, fontSize: typography.note },
  screen: { gap: spacing.lg },
});
