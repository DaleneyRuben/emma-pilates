import {
  getListAdminSalaryPaymentsQueryKey,
  getListStaffMembersQueryKey,
  listAdminSalaryPayments,
  listStaffMembers,
  recordSalaryPayment,
  updateSalaryPayment,
  type AdminSalaryPaymentDto,
  type AdminSalaryPaymentPageDto,
  type ListAdminSalaryPaymentsParams,
  type SalaryPaymentInputDto,
  type StaffMemberPageDto,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import { idempotencyHeaders } from "../../api/idempotency-key";
import { refreshAfterSalaryPayment } from "../back-office-cache";
import type { PayrollSearch } from "./payroll-search";

// Studio-wide, so no key names the selected Branch (AW34 shows the selector
// but ignores it here).
export const payrollTableQueryOptions = (search: PayrollSearch) => {
  const params: ListAdminSalaryPaymentsParams = {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.staffMemberId === undefined
      ? {}
      : { staffMemberId: search.staffMemberId }),
  };
  return queryOptions({
    queryKey: getListAdminSalaryPaymentsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminSalaryPayments(params, { signal }, adminFetch))
        .data as AdminSalaryPaymentPageDto,
    placeholderData: keepPreviousData,
  });
};

// Every Staff Member of any Role, deactivated ones too: a final payment
// after someone leaves must be recordable (BKO-001 D10). It shares the staff
// lists' key prefix, so a Personal change refreshes it.
const everyStaffParams = { page: 1, pageSize: 100 } as const;

export const payrollStaffQueryOptions = () =>
  queryOptions({
    queryKey: getListStaffMembersQueryKey(everyStaffParams),
    queryFn: async ({ signal }) =>
      (
        (await listStaffMembers(everyStaffParams, { signal }, adminFetch))
          .data as StaffMemberPageDto
      ).items.sort((a, b) => a.name.localeCompare(b.name, "es")),
  });

type SalaryPaymentChange =
  | { kind: "record"; input: SalaryPaymentInputDto; idempotencyKey: string }
  | { kind: "correct"; salaryPaymentId: string; input: SalaryPaymentInputDto };

// AW12: record a payment once per Idempotency-Key, or correct one; both are
// audited by the backend (BKO-001 D17).
export function useSalaryPaymentChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      change: SalaryPaymentChange,
    ): Promise<AdminSalaryPaymentDto> =>
      (change.kind === "record"
        ? await recordSalaryPayment(
            change.input,
            idempotencyHeaders(change.idempotencyKey),
            adminFetch,
          )
        : await updateSalaryPayment(
            change.salaryPaymentId,
            change.input,
            undefined,
            adminFetch,
          )
      ).data as AdminSalaryPaymentDto,
    onSuccess: () => refreshAfterSalaryPayment(queryClient),
  });
}
