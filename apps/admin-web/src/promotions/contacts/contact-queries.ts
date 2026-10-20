import {
  exportAdminPromotionContacts,
  getListAdminPromotionContactsQueryKey,
  listAdminPromotionContacts,
  withdrawAdminPromotionContact,
  type AdminPromotionContactDto,
  type AdminPromotionContactExportDto,
  type AdminPromotionContactPageDto,
  type ListAdminPromotionContactsParams,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import type { ClientSearch } from "../../people/people-search";

// Studio-wide like AW21: the key never names the selected Branch.
export const contactTableQueryOptions = (search: ClientSearch) => {
  const params: ListAdminPromotionContactsParams = {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.q === undefined ? {} : { q: search.q }),
  };
  return queryOptions({
    queryKey: getListAdminPromotionContactsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminPromotionContacts(params, { signal }, adminFetch))
        .data as AdminPromotionContactPageDto,
    placeholderData: keepPreviousData,
  });
};

/** Every contact, not just the page on screen; the backend audits it. */
export const fetchAllPromotionContacts = async (): Promise<
  AdminPromotionContactDto[]
> =>
  (
    (await exportAdminPromotionContacts(undefined, adminFetch))
      .data as AdminPromotionContactExportDto
  ).items;

export function useWithdrawPromotionContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) =>
      withdrawAdminPromotionContact(contactId, undefined, adminFetch),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListAdminPromotionContactsQueryKey(),
      }),
  });
}
