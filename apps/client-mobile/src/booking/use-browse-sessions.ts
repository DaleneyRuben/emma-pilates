import {
  getListSessionAvailabilityQueryKey,
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
} from "@pilates/api-contracts";
import {
  bookingStrip,
  bookingWindowDays,
  boliviaCivilDate,
  civilDateRange,
  hasStarted,
  upcomingCivilDates,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
} from "@pilates/mobile-core";
import { useMemo, useState } from "react";

import { useClientFetcher } from "../client-fetcher";
import { weekOf } from "./browse-week-notice";
import { isFrozen, useApprovedFreeze } from "./frozen-day";

export const allClassTypes = "all";

/**
 * Reservar's state (03): the chosen day, Branch and Class Type, and the
 * classes they show. The phone list and the tablet split (03T) share it.
 */
export function useBrowseSessions() {
  const fetcher = useClientFetcher();
  const today = boliviaCivilDate(new Date());
  const windowDays = bookingWindowDays(useStudioRules(fetcher));
  const dates = useMemo(() => upcomingCivilDates(today, windowDays), [today, windowDays]);
  const { strip, later } = bookingStrip(dates);
  const [chosenDate, setSelectedDate] = useState(today);
  const [choosingDate, setChoosingDate] = useState(false);
  // A day chosen before the rules arrived may lie past a shorter window.
  const selectedDate = dates.includes(chosenDate) ? chosenDate : today;
  const pickedLater = later.includes(selectedDate);
  const freeze = useApprovedFreeze(fetcher, today);
  const frozenDay = isFrozen(selectedDate, freeze);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [classTypeId, setClassTypeId] = useState(allClassTypes);
  const [choosingBranch, setChoosingBranch] = useState(false);

  const branches = useListBranches({ fetcher });
  const classTypes = useListClassTypes({ fetcher });
  const branchId =
    selectedBranchId ?? (branches.data?.status === 200 ? branches.data.data[0]?.id : undefined);
  const { from, until } = civilDateRange(selectedDate);
  const sessions = useListSessionAvailability(
    { branchId: branchId ?? "", from, until, limit: 100 },
    {
      fetcher,
      query: { enabled: branchId !== undefined, refetchOnMount: "always" },
    },
  );
  const queryKeys = [getListSessionAvailabilityQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const branchList = branches.data?.status === 200 ? branches.data.data : [];
  const classTypeList = classTypes.data?.status === 200 ? classTypes.data.data : [];
  const selectedBranch = branchList.find((branch) => branch.id === branchId);
  const now = new Date();
  const visibleSessions =
    sessions.data?.status === 200
      ? sessions.data.data.filter(
          (session) =>
            !hasStarted(session.startsAt, now) &&
            (classTypeId === allClassTypes || session.classTypeId === classTypeId),
        )
      : [];

  const failed =
    branches.isError ||
    (branches.data !== undefined && branches.data.status !== 200) ||
    sessions.isError ||
    (sessions.data !== undefined && sessions.data.status !== 200);
  const loading = branches.isPending || (branchId !== undefined && sessions.isPending);
  // Every Session of one day falls in the same week, so the first says it.
  // A day without classes, or still loading, keeps its week's last count so
  // the strip does not jump (review of FIX-082).
  const counted =
    sessions.data?.status === 200 ? sessions.data.data[0]?.classesLeftThisWeek : undefined;
  const [lastCount, setLastCount] = useState<{ week: string; left: number | null } | null>(null);
  const week = weekOf(selectedDate);
  if (counted !== undefined && (lastCount?.week !== week || lastCount.left !== counted)) {
    setLastCount({ week, left: counted });
  }
  const classesLeft =
    counted !== undefined ? counted : lastCount?.week === week ? lastCount.left : undefined;

  return {
    branchId,
    branchList,
    choosingBranch,
    choosingDate,
    classesLeft,
    classTypeId,
    classTypeList,
    dates,
    failed,
    freeze,
    frozenDay,
    later,
    loading,
    pickedLater,
    refetch: () => {
      void branches.refetch();
      void sessions.refetch();
    },
    refreshControl,
    selectedBranch,
    selectedDate,
    setChoosingBranch,
    setChoosingDate,
    setClassTypeId,
    setSelectedBranchId,
    setSelectedDate,
    strip,
    today,
    visibleSessions,
    windowDays,
  };
}

export type BrowseState = ReturnType<typeof useBrowseSessions>;
