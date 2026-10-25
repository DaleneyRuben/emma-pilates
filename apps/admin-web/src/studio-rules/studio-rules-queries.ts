import {
  getGetStudioRulesQueryKey,
  getGetStudioSettingsQueryKey,
  getStudioRules,
  getStudioSettings,
  updateStudioSettings,
  type StudioRulesDto,
  type StudioSettingsDto,
  type UpdateStudioSettingsDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";

// The public rules (BKM-004) the admin web shows in its own copy, such as
// AW03's cancellation; they change rarely, as the API's one-minute cache says.
export const studioRulesQueryOptions = () =>
  queryOptions({
    queryKey: getGetStudioRulesQueryKey(),
    queryFn: async ({ signal }) =>
      (await getStudioRules({ signal }, adminFetch)).data as StudioRulesDto,
    staleTime: 60_000,
  });

export const studioSettingsQueryOptions = () =>
  queryOptions({
    queryKey: getGetStudioSettingsQueryKey(),
    queryFn: async ({ signal }) =>
      (await getStudioSettings({ signal }, adminFetch))
        .data as StudioSettingsDto,
  });

// A save answers the new version, which replaces the cached one; the public
// rules are read again because a change may touch them.
export function useStudioSettingsChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateStudioSettingsDto) =>
      (await updateStudioSettings(input, undefined, adminFetch))
        .data as StudioSettingsDto,
    onSuccess: async (saved) => {
      queryClient.setQueryData(getGetStudioSettingsQueryKey(), saved);
      await queryClient.invalidateQueries({
        queryKey: getGetStudioRulesQueryKey(),
      });
    },
  });
}
