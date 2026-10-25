import {
  exportAdminFeedback,
  getListAdminFeedbackQueryKey,
  listAdminFeedback,
  triageAdminFeedback,
  type AdminFeedbackDto,
  type AdminFeedbackExportDto,
  type AdminFeedbackPageDto,
  type ListAdminFeedbackParams,
  type TriageFeedbackDto,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import type { FeedbackSearch } from "./feedback-search";

// Studio-wide: the key never names the selected Branch.
export const feedbackTableQueryOptions = (search: FeedbackSearch) => {
  const params: ListAdminFeedbackParams = {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.status === "all" ? {} : { status: search.status }),
    ...(search.app === "all" ? {} : { app: search.app }),
  };
  return queryOptions({
    queryKey: getListAdminFeedbackQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminFeedback(params, { signal }, adminFetch))
        .data as AdminFeedbackPageDto,
    placeholderData: keepPreviousData,
  });
};

/** Every comment, not just the page on screen; the backend audits it. */
export const fetchAllFeedback = async (): Promise<AdminFeedbackDto[]> =>
  (
    (await exportAdminFeedback(undefined, adminFetch))
      .data as AdminFeedbackExportDto
  ).items;

export function useTriageFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { feedbackId: string } & TriageFeedbackDto) => {
      const { feedbackId, ...body } = input;
      return (
        await triageAdminFeedback(feedbackId, body, undefined, adminFetch)
      ).data as AdminFeedbackDto;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListAdminFeedbackQueryKey(),
      }),
  });
}
