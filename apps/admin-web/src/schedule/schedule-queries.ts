import {
  getListAdministratorSessionsQueryKey,
  getListSessionSchedulesQueryKey,
  listAdminClassTypes,
  listAdministratorSessions,
  listSessionSchedules,
  listStaffMembers,
  getListAdminClassTypesQueryKey,
  getListStaffMembersQueryKey,
  type AdminClassTypePageDto,
  type AdminSessionScheduleDto,
  type AdministratorSessionAvailabilityDto,
  type ListAdministratorSessionsParams,
  type StaffMemberPageDto,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { addDays, boliviaInstant } from "../lib/bolivia-time";

/** The backend's page cap; a busier week says so instead of hiding it. */
export const weekSessionLimit = 100;

const weekParams = (
  branchId: string,
  monday: string,
): ListAdministratorSessionsParams => ({
  from: boliviaInstant(monday, "00:00"),
  until: boliviaInstant(addDays(monday, 7), "00:00"),
  limit: weekSessionLimit,
  branchId,
});

// ADR-0042: the key carries the Branch and the week, so switching Branch
// never shows another Branch's Sessions and a change can invalidate exactly
// the selected Branch's weeks.
export const weekSessionsQueryOptions = (branchId: string, monday: string) => {
  const params = weekParams(branchId, monday);
  return queryOptions({
    queryKey: getListAdministratorSessionsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdministratorSessions(params, { signal }, adminFetch))
        .data as AdministratorSessionAvailabilityDto[],
    placeholderData: keepPreviousData,
  });
};

export const isBranchSessionsKey =
  (branchId: string) =>
  ({ queryKey }: { queryKey: readonly unknown[] }): boolean =>
    queryKey[0] === getListAdministratorSessionsQueryKey()[0] &&
    (queryKey[1] as { branchId?: string } | undefined)?.branchId === branchId;

export const branchSchedulesQueryOptions = (branchId: string) =>
  queryOptions({
    queryKey: getListSessionSchedulesQueryKey({ branchId }),
    queryFn: async ({ signal }) =>
      (await listSessionSchedules({ branchId }, { signal }, adminFetch))
        .data as AdminSessionScheduleDto[],
  });

const activeClassTypesParams = { status: "active", pageSize: 100 } as const;

export const activeClassTypesQueryOptions = () =>
  queryOptions({
    queryKey: getListAdminClassTypesQueryKey(activeClassTypesParams),
    queryFn: async ({ signal }) =>
      (
        (
          await listAdminClassTypes(
            activeClassTypesParams,
            { signal },
            adminFetch,
          )
        ).data as AdminClassTypePageDto
      ).items,
  });

// AW03: only Trainers assigned to the Branch, and never a deactivated one
// (the backend refuses them as `trainer_not_assignable`).
export const branchTrainersQueryOptions = (branchId: string) => {
  const params = { role: "trainer", branchId, pageSize: 100 } as const;
  return queryOptions({
    queryKey: getListStaffMembersQueryKey(params),
    queryFn: async ({ signal }) =>
      (
        (await listStaffMembers(params, { signal }, adminFetch))
          .data as StaffMemberPageDto
      ).items
        .filter((member) => member.status !== "deactivated")
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
  });
};
