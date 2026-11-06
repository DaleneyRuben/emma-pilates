import { getGetClientPhotoForStaffUrl } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";

import { loadProfilePhoto } from "../api/private-image";
import { PersonAvatar } from "./person-avatar";
import type { StaffPhotoVariant } from "./use-staff-photo";

/**
 * Finding n.º 30 (owner, 2026-11-05): a Client where the staff see her (a
 * roster, Pagos pendientes, the client file), her photo by the asset the read
 * model names, or her initials while she has none. Keyed by the asset, so an
 * unchanged photo is never fetched twice; never persisted (ADR-0035).
 */
export function ClientFace({
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
  const imageAssetId = photo?.imageAssetId ?? null;
  const query = useQuery({
    queryKey: ["client-photo-for-staff", imageAssetId, variant],
    queryFn: () =>
      loadProfilePhoto(fetcher, getGetClientPhotoForStaffUrl(imageAssetId ?? "", { variant })),
    enabled: imageAssetId !== null,
    staleTime: Infinity,
  });
  const photoUri = imageAssetId === null ? null : (query.data ?? null);
  return <PersonAvatar name={name} photoUri={photoUri} size={size} />;
}
