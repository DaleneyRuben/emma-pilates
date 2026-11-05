import {
  getGetCurrentStaffMemberProfileQueryKey,
  removeCurrentStaffMemberPhoto,
  setCurrentStaffMemberPhoto,
  type StaffProfileDto,
} from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  NoticeRow,
  PersonAvatar,
  spacing,
  TextButton,
  typography,
  useStaffPhoto,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { loadImageUpload } from "../uploads/load-image-upload";

type PhotoState =
  | { status: "idle" }
  | { status: "uploading"; localUri: string }
  | { status: "removing" }
  | { status: "failed"; message: string };

type ProfileQueryData = { data: StaffProfileDto; status: number; headers: Headers };

const uploadFailed = "No pudimos subir la foto. Inténtalo de nuevo.";
const removalFailed = "No pudimos quitar la foto. Inténtalo de nuevo.";
const avatarSize = 72;

/**
 * S23's summary under proposal A (follow-ups 240–242, 247): her 72 px photo
 * or initials, her name and email, «Cambiar foto» and «Quitar foto», and the
 * role's note. The photo is saved the moment the upload finishes.
 */
export function StaffPhotoSummary({ member, note }: { member: StaffProfileDto; note: string }) {
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PhotoState>({ status: "idle" });
  const storedUri = useStaffPhoto(fetcher, member.photo, "display");
  const shownUri =
    state.status === "uploading" ? state.localUri : state.status === "removing" ? null : storedUri;

  const remember = (photo: StaffProfileDto["photo"]) =>
    queryClient.setQueryData<ProfileQueryData>(getGetCurrentStaffMemberProfileQueryKey(), (old) =>
      old === undefined || old.status !== 200 ? old : { ...old, data: { ...old.data, photo } },
    );

  const change = async () => {
    try {
      const { pickImage, uploadImage } = await loadImageUpload();
      const picked = await pickImage();
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
      setState({ status: "idle" });
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
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.detail}>{member.email}</Text>
          {member.phone ? <Text style={styles.detail}>{member.phone}</Text> : null}
          <View style={styles.actions}>
            {state.status === "uploading" || state.status === "removing" ? (
              <Text style={styles.busy}>
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
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

/** The v2 secondary button: Rosa enlace on Rosa tinte, 40 high. */
function TintButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tint, pressed && styles.pressed]}
    >
      <Text style={styles.tintLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 40,
  },
  block: { gap: spacing.md },
  body: { flex: 1, gap: spacing.xxs },
  busy: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  name: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 20 },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  pressed: { opacity: 0.7 },
  summary: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  tint: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  tintLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 15,
    fontWeight: "600",
  },
  // Marfil at 55 % with the busy ring (follow-up 241 §2), only while uploading.
  veil: {
    alignItems: "center",
    backgroundColor: "rgba(250, 247, 242, 0.55)",
    borderRadius: avatarSize / 2,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
