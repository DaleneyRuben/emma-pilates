import { PersonAvatar } from "./person-avatar";
import { type StaffPhotoVariant, useStaffPhoto } from "./use-staff-photo";

/**
 * FIX-041: a Staff Member where she appears (Reservar, the class detail, Mis
 * reservas, Horario, Perfil): the 96 px thumbnail for the small circles, the
 * 320 px display variant from 56 px up.
 */
export function StaffFace({
  fetcher,
  name,
  photo,
  size,
  variant = size >= 56 ? "display" : "thumbnail",
}: {
  fetcher: typeof globalThis.fetch;
  name: string;
  photo: { imageAssetId: string } | null;
  size: number;
  variant?: StaffPhotoVariant;
}) {
  const photoUri = useStaffPhoto(fetcher, photo, variant);
  return <PersonAvatar name={name} photoUri={photoUri} size={size} />;
}
