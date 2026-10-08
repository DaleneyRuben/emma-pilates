import {
  getGetCurrentClientProfileQueryKey,
  removeCurrentClientPhoto,
  setCurrentClientPhoto,
  type ClientProfileDto,
} from "@pilates/api-contracts";
import { BodyText, colors, spacing, TextButton, typography } from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { pickImage, uploadImage } from "../uploads/image-upload";
import { ClientAvatar } from "./client-avatar";
import { useClientPhoto } from "./use-client-photo";

type PhotoState =
  | { status: "idle" }
  | { status: "uploading"; localUri: string }
  | { status: "removing" }
  | { status: "failed"; message: string };

const uploadFailed = "No pudimos subir la foto. Inténtalo de nuevo.";
const removalFailed = "No pudimos quitar la foto. Inténtalo de nuevo.";

// Client 22's «Cambiar foto» / «Quitar foto»: the chosen image shows inside
// the circle at once (as the centre crop will frame it, follow-up 60 §1)
// while the shared upload protocol runs and the READY asset is attached.
export function ProfilePhotoSection({ client }: { client: ClientProfileDto }) {
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PhotoState>({ status: "idle" });
  const storedUri = useClientPhoto(client.photo?.imageAssetId ?? null);
  const busy = state.status === "uploading" || state.status === "removing";
  const shownUri =
    state.status === "uploading" ? state.localUri : state.status === "removing" ? null : storedUri;

  const remember = (profile: ClientProfileDto) =>
    queryClient.setQueryData(getGetCurrentClientProfileQueryKey(), {
      data: profile,
      status: 200,
      headers: new Headers(),
    });

  const change = async () => {
    const picked = await pickImage();
    if (picked === null) return;
    setState({ status: "uploading", localUri: picked.uri });
    try {
      const imageAssetId = await uploadImage(picked, "profile_photo", fetcher);
      const response = await setCurrentClientPhoto(
        { imageAssetId },
        { headers: { "Content-Type": "application/json" } },
        fetcher,
      );
      if (response.status !== 200) throw new Error("photo_attachment_failed");
      remember(response.data);
      setState({ status: "idle" });
    } catch {
      setState({ status: "failed", message: uploadFailed });
    }
  };

  const remove = async () => {
    setState({ status: "removing" });
    const response = await removeCurrentClientPhoto(undefined, fetcher);
    if (response.status !== 204) {
      setState({ status: "failed", message: removalFailed });
      return;
    }
    remember({ ...client, photo: null });
    setState({ status: "idle" });
  };

  return (
    <View style={styles.section}>
      <ClientAvatar name={client.name} photoUri={shownUri} size={96} />
      {shownUri === null ? null : (
        <BodyText style={styles.note}>Se recorta al centro en forma de círculo.</BodyText>
      )}
      {state.status === "uploading" ? (
        <BodyText accessibilityLabel="Subiendo foto" style={styles.note}>
          Subiendo foto…
        </BodyText>
      ) : (
        <View style={styles.actions}>
          <TextButton disabled={busy} label="Cambiar foto" onPress={() => void change()} />
          {client.photo === null || state.status === "removing" ? null : (
            <TextButton disabled={busy} label="Quitar foto" onPress={() => void remove()} />
          )}
        </View>
      )}
      {state.status === "failed" ? (
        <BodyText accessibilityRole="alert" style={styles.error}>
          {state.message}
        </BodyText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.md },
  error: { color: colors.errorText, textAlign: "center" },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  section: { alignItems: "center", gap: spacing.sm },
});
