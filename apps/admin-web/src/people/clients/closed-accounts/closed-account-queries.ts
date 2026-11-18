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
import { adminFetch } from "../../../api/fetcher";
import type { ClientSearch } from "../../people-search";

// FIX-065 (walkthrough finding 91): Clientas › Cuenta cerrada reads the
// former Clients' Promotion Contacts (ADR-0097) only, studio-wide.
export const closedAccountTableQueryOptions = (search: ClientSearch) => {
  const params: ListAdminPromotionContactsParams = {
    page: search.page,
    pageSize: search.pageSize,
    kind: "former_client",
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

/** Every closed account the search matches; the backend audits it. */
export const fetchAllClosedAccounts = async (
  q: string | undefined,
): Promise<AdminPromotionContactDto[]> =>
  (
    (
      await exportAdminPromotionContacts(
        { kind: "former_client", ...(q === undefined ? {} : { q }) },
        undefined,
        adminFetch,
      )
    ).data as AdminPromotionContactExportDto
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
