import {
  getPreviewCampaignQueryKey,
  grantCampaign,
  previewCampaign,
  type CampaignPreviewDto,
  type CampaignResultDto,
  type GrantCampaignDto,
} from "@pilates/api-contracts";
import { queryOptions, useMutation } from "@tanstack/react-query";
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
  return useMutation({
    mutationFn: async (input: GrantCampaignDto) =>
      (
        await grantCampaign(
          input,
          idempotencyHeaders(keyFor(input)),
          adminFetch,
        )
      ).data as CampaignResultDto,
  });
}
