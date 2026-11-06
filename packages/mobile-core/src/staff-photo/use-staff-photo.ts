import { getGetStaffPhotoUrl } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";

import { loadProfilePhoto } from "../api/private-image";

export type StaffPhotoVariant = "display" | "thumbnail";

/**
 * FIX-041: a Staff Member's photo as a data URI, keyed by its asset, so a
 * changed photo is a new key and an unchanged one is never fetched again. A
 * private image never enters the persisted cache (ADR-0035 allowlist).
 */
export function useStaffPhoto(
  fetcher: typeof globalThis.fetch,
  photo: { imageAssetId: string } | null,
  variant: StaffPhotoVariant = "thumbnail",
): string | null {
  const imageAssetId = photo?.imageAssetId ?? null;
  const query = useQuery({
    queryKey: ["staff-photo", imageAssetId, variant],
    queryFn: () => loadProfilePhoto(fetcher, getGetStaffPhotoUrl(imageAssetId ?? "", { variant })),
    enabled: imageAssetId !== null,
    staleTime: Infinity,
  });
  return imageAssetId === null ? null : (query.data ?? null);
}
