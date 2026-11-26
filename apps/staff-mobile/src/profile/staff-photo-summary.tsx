import {
  getGetCurrentStaffMemberProfileQueryKey,
  removeCurrentStaffMemberPhoto,
  setCurrentStaffMemberPhoto,
  type StaffProfileDto,
} from "@pilates/api-contracts";
import {
  colors,
  NoticeRow,
  PersonAvatar,
  profilePhotoMaxEdge,
  phoneWithFlag,
  spacing,
  surfaces,
  Text,
  TextButton,
  useStaffPhoto,
  radii,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { loadImageUpload } from "../uploads/load-image-upload";

type PhotoState =
  | { status: "idle"; previewUri?: string }
  | { status: "uploading"; localUri: string }
  | { status: "removing" }
  | { status: "failed"; message: string };

type ProfileQueryData = { data: StaffProfileDto; status: number; headers: Headers };

const uploadFailed = "No pudimos subir la foto. Inténtalo de nuevo.";
const removalFailed = "No pudimos quitar la foto. Inténtalo de nuevo.";
const avatarSize = 64;

/**
 * S23's summary under proposal A (follow-ups 240–242, 247), on its white card
 * (E-F01): her 64 px photo
 * or initials, her name and email, «Cambiar foto» and «Quitar foto», and the
 * role's note. The photo is saved the moment the upload finishes.
 */
export function StaffPhotoSummary({
  editable = true,
  member,
  note,
}: {
  /** False while an Administrator sees the app as her (walkthrough finding 115). */
  editable?: boolean;
  member: StaffProfileDto;
  note: string;
}) {
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PhotoState>({ status: "idle" });
  const storedUri = useStaffPhoto(fetcher, member.photo, "display");
  // The picked photo stays until the stored one loads: no initials between.
  const shownUri =
    state.status === "uploading"
      ? state.localUri
      : state.status === "removing"
        ? null
        : (storedUri ?? (state.status === "idle" ? (state.previewUri ?? null) : null));

  const remember = (photo: StaffProfileDto["photo"]) =>
    queryClient.setQueryData<ProfileQueryData>(getGetCurrentStaffMemberProfileQueryKey(), (old) =>
      old === undefined || old.status !== 200 ? old : { ...old, data: { ...old.data, photo } },
    );

  // Horario, S08 and the rosters may show her: refetch them so none keeps
  // the asset the change just released (ADR-0076).
  const refreshOthers = () =>
    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] !== "staff-photo" &&
        query.queryKey[0] !== getGetCurrentStaffMemberProfileQueryKey()[0],
    });

  const change = async () => {
    try {
      const { pickImage, uploadImage } = await loadImageUpload();
      const picked = await pickImage({ maxEdge: profilePhotoMaxEdge });
      if (picked === null) return;
      setState({ status: "uploading", localUri: picked.uri });
      const imageAssetId = await uploadImage(picked, "profile_photo", fetcher);
      const response = await setCurrentStaffMemberPhoto(
        { imageAssetId },
        { headers: { "Content-Type": "application/json" } },
        fetcher,
      );
      if (response.status !== 200) throw new Error("photo_attachment_failed");
      remember(response.data.photo);
      setState({ status: "idle", previewUri: picked.uri });
      refreshOthers();
    } catch {
      setState({ status: "failed", message: uploadFailed });
    }
  };

  const remove = async () => {
    setState({ status: "removing" });
    try {
      const response = await removeCurrentStaffMemberPhoto(undefined, fetcher);
      if (response.status !== 204) throw new Error("photo_removal_failed");
      remember(null);
      refreshOthers();
      setState({ status: "idle" });
    } catch {
      setState({ status: "failed", message: removalFailed });
    }
  };

  return (
    <View style={styles.block}>
      <View style={styles.summary}>
        <View>
          <PersonAvatar name={member.name} photoUri={shownUri} size={avatarSize} />
          {state.status === "uploading" ? (
            <View style={styles.veil} testID="photo-veil">
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text variant="titulo-bloque">{member.name}</Text>
          <Text variant="secundario">{member.email}</Text>
          {member.phone ? <Text variant="secundario">{phoneWithFlag(member.phone)}</Text> : null}
          <View style={styles.actions}>
            {!editable ? null : state.status === "uploading" || state.status === "removing" ? (
              <Text variant="secundario">
                {state.status === "uploading" ? "Subiendo foto…" : "Quitando foto…"}
              </Text>
            ) : (
              <>
                <TintButton label="Cambiar foto" onPress={() => void change()} />
                {member.photo === null ? null : (
                  <TextButton label="Quitar foto" onPress={() => void remove()} />
                )}
              </>
            )}
          </View>
        </View>
      </View>
      {state.status === "failed" ? <NoticeRow message={state.message} /> : null}
      <Text variant="secundario">{note}</Text>
    </View>
  );
}

/** The secondary button (FIX-089): Crema with a Rosa profundo outline. */
function TintButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tint, pressed && styles.pressed]}
    >
      <Text variant="boton-chico">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 44,
  },
  block: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  body: { flex: 1, gap: spacing.xxs },
  pressed: { opacity: 0.7 },
  summary: { alignItems: "center", flexDirection: "row", gap: spacing.mdLg },
  // FIX-089: the secondary button, Crema with a Rosa profundo outline.
  tint: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.button,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  // Marfil at 55 % with the busy ring (follow-up 241 §2), only while uploading.
  veil: {
    alignItems: "center",
    backgroundColor: colors.scrim,
    borderRadius: avatarSize / 2,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
