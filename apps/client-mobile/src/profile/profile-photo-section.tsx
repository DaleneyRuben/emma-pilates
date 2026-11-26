import {
  getGetCurrentClientProfileQueryKey,
  removeCurrentClientPhoto,
  setCurrentClientPhoto,
  type ClientProfileDto,
} from "@pilates/api-contracts";
import {
  InlineError,
  NoticeRow,
  PhotoUploadRing,
  profilePhotoMaxEdge,
  spacing,
  surfaces,
  TextButton,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { pickImage, uploadImage, type PickedImage } from "../uploads/image-upload";
import { ClientAvatar } from "./client-avatar";
import { useClientPhoto } from "./use-client-photo";

type PhotoState =
  | { status: "idle" }
  | { status: "uploading"; picked: PickedImage }
  | { status: "upload-failed"; picked: PickedImage }
  | { status: "removing" }
  | { status: "removal-failed" };

const uploadFailed = "No pudimos subir tu foto. Tus otros cambios sí se guardaron.";
const removalFailed = "No pudimos quitar la foto. Inténtalo de nuevo.";
const avatarSize = 96;

// Client 22's «Cambiar foto» / «Quitar foto». Walkthrough n.º 14 (C22c,
// C22d): the chosen photo shows in the circle at once, under a ring while it
// uploads in the background; nothing else waits for it, «Guardar cambios»
// included. Only a failure speaks, and «Reintentar» sends the same photo.
export function ProfilePhotoSection({ client }: { client: ClientProfileDto }) {
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PhotoState>({ status: "idle" });
  const storedUri = useClientPhoto(client.photo?.imageAssetId ?? null);
  const busy = state.status === "uploading" || state.status === "removing";
  const shownUri =
    state.status === "uploading" || state.status === "upload-failed"
      ? state.picked.uri
      : state.status === "removing"
        ? null
        : storedUri;

  const remember = (profile: ClientProfileDto) =>
    queryClient.setQueryData(getGetCurrentClientProfileQueryKey(), {
      data: profile,
      status: 200,
      headers: new Headers(),
    });

  const upload = async (picked: PickedImage) => {
    setState({ status: "uploading", picked });
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
      setState({ status: "upload-failed", picked });
    }
  };

  const change = async () => {
    const picked = await pickImage({ maxEdge: profilePhotoMaxEdge });
    if (picked !== null) await upload(picked);
  };

  const remove = async () => {
    setState({ status: "removing" });
    const response = await removeCurrentClientPhoto(undefined, fetcher);
    if (response.status !== 204) {
      setState({ status: "removal-failed" });
      return;
    }
    remember({ ...client, photo: null });
    setState({ status: "idle" });
  };

  return (
    <View style={styles.section}>
      <PhotoUploadRing size={avatarSize} uploading={state.status === "uploading"}>
        <ClientAvatar name={client.name} photoUri={shownUri} size={avatarSize} />
      </PhotoUploadRing>
      <View style={styles.actions}>
        <TextButton
          disabled={busy}
          label="Cambiar foto"
          onPress={() => void change()}
          style={styles.link}
        />
        {client.photo === null || state.status === "removing" ? null : (
          <TextButton
            disabled={busy}
            label="Quitar foto"
            onPress={() => void remove()}
            style={styles.link}
          />
        )}
      </View>
      {state.status === "upload-failed" ? (
        <>
          <NoticeRow message={uploadFailed} testID="photo-upload-failed" />
          <TextButton
            label="Reintentar"
            onPress={() => void upload(state.picked)}
            style={styles.link}
          />
        </>
      ) : null}
      {state.status === "removal-failed" ? (
        <InlineError style={styles.centered}>{removalFailed}</InlineError>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.xlSm },
  centered: { textAlign: "center" },
  link: { paddingHorizontal: 0 },
  // C22: the photo and its links on their own white card.
  section: { ...surfaces.card, alignItems: "center", gap: spacing.smLg, padding: spacing.lgXl },
});
