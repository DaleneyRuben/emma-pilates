import {
  getGetCurrentStaffMemberProfileQueryKey,
  removeCurrentStaffMemberPhoto,
  setCurrentStaffMemberPhoto,
  type StaffProfileDto,
} from "@pilates/api-contracts";
import {
  NoticeRow,
  PersonAvatar,
  PhotoUploadRing,
  profilePhotoMaxEdge,
  phoneWithFlag,
  spacing,
  surfaces,
  Text,
  useStaffPhoto,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { loadImageUpload } from "../uploads/load-image-upload";

type PickedImage = { uri: string; bytes: Uint8Array<ArrayBuffer> };

type PhotoState =
  | { status: "idle"; previewUri?: string }
  | { status: "uploading"; picked: PickedImage }
  | { status: "upload-failed"; picked: PickedImage }
  | { status: "removing" }
  | { status: "failed"; message: string };

type ProfileQueryData = { data: StaffProfileDto; status: number; headers: Headers };

// Walkthrough n.º 14 (C22d): Perfil has no other changes to keep, so the
// notice says only what failed.
const uploadFailed = "No pudimos subir tu foto.";
const removalFailed = "No pudimos quitar la foto. Inténtalo de nuevo.";
const avatarSize = 56;

/**
 * S23's summary (follow-ups 240–242, 247) on the Client's deep-rose identity
 * card (walkthrough n.º 16, E-F01, E-F03): her 56 px photo or initials, her
 * name, her Role and Branches (follow-up 293), email and phone, «Cambiar foto» («Quitar foto» once she has one) and
 * the role's note. The photo is saved the moment the upload finishes.
 */
export function StaffPhotoSummary({
  editable = true,
  member,
  note,
  roleLine,
}: {
  /** False while an Administrator sees the app as her (walkthrough finding 115). */
  editable?: boolean;
  member: StaffProfileDto;
  note: string;
  /** Her Role and Branches under her name, «Instructora · Achumani, Norte» (follow-up 293). */
  roleLine: string;
}) {
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PhotoState>({ status: "idle" });
  const storedUri = useStaffPhoto(fetcher, member.photo, "display");
  // The picked photo stays until the stored one loads: no initials between.
  const shownUri =
    state.status === "uploading" || state.status === "upload-failed"
      ? state.picked.uri
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

  // C22c: the photo shows at once under the ring; «Reintentar» sends it again.
  const upload = async (picked: PickedImage) => {
    setState({ status: "uploading", picked });
    try {
      const { uploadImage } = await loadImageUpload();
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
      setState({ status: "upload-failed", picked });
    }
  };

  const change = async () => {
    // One upload at a time: the links stay visible while it runs (C22c).
    if (state.status === "uploading") return;
    try {
      const { pickImage } = await loadImageUpload();
      const picked = await pickImage({ maxEdge: profilePhotoMaxEdge });
      if (picked !== null) await upload(picked);
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
    <View style={styles.block} testID="profile-identity">
      <View style={styles.summary}>
        <PhotoUploadRing size={avatarSize} uploading={state.status === "uploading"}>
          <PersonAvatar name={member.name} onEmphasis photoUri={shownUri} size={avatarSize} />
        </PhotoUploadRing>
        <View style={styles.body}>
          <Text tone="onDark" variant="titulo-bloque">
            {member.name}
          </Text>
          <Text tone="onDark" variant="compacto-600">
            {roleLine}
          </Text>
          <Text tone="onDark" variant="cuerpo">
            {member.email}
          </Text>
          {member.phone ? (
            <Text tone="onDark" variant="cuerpo">
              {phoneWithFlag(member.phone)}
            </Text>
          ) : null}
          <View style={styles.actions}>
            {!editable ? null : state.status === "removing" ? (
              <Text tone="onDark" variant="secundario">
                Quitando foto…
              </Text>
            ) : (
              <>
                <CardLink label="Cambiar foto" onPress={() => void change()} />
                {member.photo === null ? null : (
                  <CardLink label="Quitar foto" onPress={() => void remove()} />
                )}
              </>
            )}
          </View>
        </View>
      </View>
      {state.status === "failed" ? <NoticeRow message={state.message} /> : null}
      {state.status === "upload-failed" ? (
        <>
          <NoticeRow message={uploadFailed} />
          <View style={styles.retry}>
            <CardLink label="Reintentar" onPress={() => void upload(state.picked)} />
          </View>
        </>
      ) : null}
      <Text tone="onDark" variant="secundario">
        {note}
      </Text>
    </View>
  );
}

/** An underlined white link on the identity card (E-F03 «Cambiar foto»). */
function CardLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text tone="onDark" variant="enlace">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  block: { ...surfaces.emphasis, gap: spacing.smLg, padding: spacing.xlSm },
  body: { flex: 1, gap: spacing.xxs },
  link: { justifyContent: "center", minHeight: 32 },
  pressed: { opacity: 0.7 },
  summary: { alignItems: "center", flexDirection: "row", gap: spacing.mdLg },
  retry: { flexDirection: "row", justifyContent: "center" },
});
