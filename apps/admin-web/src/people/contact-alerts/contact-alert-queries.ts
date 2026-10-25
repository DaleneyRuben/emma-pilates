import {
  getListContactAlertsQueryKey,
  listContactAlerts,
  markClientContacted,
  type ContactAlertListDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

export const contactAlertListQueryOptions = () =>
  queryOptions({
    queryKey: getListContactAlertsQueryKey(),
    queryFn: async ({ signal }) =>
      (await listContactAlerts({ signal }, adminFetch))
        .data as ContactAlertListDto,
  });

export const contactAlertCountQueryOptions = () =>
  queryOptions({
    ...contactAlertListQueryOptions(),
    select: (page) => page.totalItems,
  });

export function useMarkClientContacted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) =>
      markClientContacted(clientId, undefined, adminFetch),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListContactAlertsQueryKey(),
      }),
  });
}
