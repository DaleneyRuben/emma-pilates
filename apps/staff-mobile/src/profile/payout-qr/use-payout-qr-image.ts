import { loadPrivateImageWithRatio } from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";

import { useStaffFetcher } from "../../staff-fetcher";

// Her QR is a private image read through her own route (FIX-072); the
// thumbnail fits the date sheet, `readable` the card and the full screen.
export function usePayoutQrImage(url: string | null, variant: "thumbnail" | "readable") {
  const fetcher = useStaffFetcher();
  return useQuery({
    queryKey: ["payout-qr-image", url, variant],
    queryFn: async () => {
      const loaded = await loadPrivateImageWithRatio(fetcher, `${url}?variant=${variant}`);
      if (loaded === null) throw new Error("The payout QR could not be loaded");
      return loaded;
    },
    enabled: url !== null,
    retry: false,
  });
}
