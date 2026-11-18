import {
  getPreviewCampaignQueryKey,
  grantCampaign,
  previewCampaign,
  type CampaignPreviewDto,
  type CampaignResultDto,
  type GrantCampaignDto,
} from "@pilates/api-contracts";
import { queryOptions, useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { adminFetch } from "../api/fetcher";
import { idempotencyHeaders, useIdempotencyKey } from "../api/idempotency-key";

export const campaignPreviewQueryOptions = () =>
  queryOptions({
    queryKey: getPreviewCampaignQueryKey(),
    queryFn: async ({ signal }) =>
      (await previewCampaign({ signal }, adminFetch))
        .data as CampaignPreviewDto,
  });

export function useCampaignGrant() {
  const keyFor = useIdempotencyKey();
  // Review of walkthrough finding 92: a retry of an unanswered grant reuses
  // its key, but once a grant succeeds the same campaign given again on
  // purpose is a new grant and takes a new key.
  const granted = useRef(0);
  return useMutation({
    mutationFn: async (input: GrantCampaignDto) =>
      (
        await grantCampaign(
          input,
          idempotencyHeaders(keyFor({ ...input, granted: granted.current })),
          adminFetch,
        )
      ).data as CampaignResultDto,
    onSuccess: () => {
      granted.current += 1;
    },
  });
}
