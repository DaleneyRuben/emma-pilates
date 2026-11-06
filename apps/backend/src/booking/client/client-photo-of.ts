// FIX-041: how every Staff read model names a Client's photo: the asset it
// shows (`GET /client-photos/{imageAssetId}`), or null while her initials
// stand in.
export type ClientPhotoRef = { imageAssetId: string } | null;

export const clientPhotoOf = (
  profileImageAssetId: string | null,
): ClientPhotoRef =>
  profileImageAssetId === null ? null : { imageAssetId: profileImageAssetId };

// The Client a Staff row names: select it as `client: clientNameSelect` and
// spread `clientNameAndPhoto(row.client)` into the row.
export const clientNameSelect = {
  select: { name: true, profileImageAssetId: true },
} as const;

export const clientNameAndPhoto = (client: {
  name: string;
  profileImageAssetId: string | null;
}): { clientName: string; clientPhoto: ClientPhotoRef } => ({
  clientName: client.name,
  clientPhoto: clientPhotoOf(client.profileImageAssetId),
});
