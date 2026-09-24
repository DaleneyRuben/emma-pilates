import { getGetCurrentClientPhotoUrl } from "@pilates/api-contracts";
import { loadPrivateImage } from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";

import { useClientFetcher } from "../client-fetcher";

// The display variant (320 px centre crop, UPL-002) as a data URI, keyed by
// the asset so a replaced photo is fetched again; a private image never
// enters the persisted cache (ADR-0035 allowlist).
export function useClientPhoto(imageAssetId: string | null): string | null {
  const fetcher = useClientFetcher();
  const photo = useQuery({
    queryKey: ["client-photo", imageAssetId],
    queryFn: () =>
      loadPrivateImage(fetcher, getGetCurrentClientPhotoUrl({ variant: "display" })),
    enabled: imageAssetId !== null,
    staleTime: Infinity,
  });
  return imageAssetId === null ? null : (photo.data ?? null);
}
