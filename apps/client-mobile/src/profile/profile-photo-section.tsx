import {
  getGetCurrentClientProfileQueryKey,
  removeCurrentClientPhoto,
  setCurrentClientPhoto,
  type ClientProfileDto,
} from "@pilates/api-contracts";
import {
  InlineError,
  profilePhotoMaxEdge,
  spacing,
  surfaces,
  Text,
  TextButton,
} from "@pilates/mobile-core";
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
    const picked = await pickImage({ maxEdge: profilePhotoMaxEdge });
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
      {state.status === "uploading" ? (
        <Text accessibilityLabel="Subiendo foto" style={styles.centered} variant="secundario">
          Subiendo foto…
        </Text>
      ) : (
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
      )}
      {state.status === "failed" ? (
        <InlineError style={styles.centered}>{state.message}</InlineError>
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
