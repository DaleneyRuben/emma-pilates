import {
  cancelSession,
  createOneOffSession,
  createSessionSchedule,
  endSessionSchedule,
  getListSessionSchedulesQueryKey,
  replaceSessionSchedule,
  updateSession,
  type SessionCancellationDto,
  type SessionChangeDto,
  type SessionInputDto,
  type SessionScheduleCreationDto,
  type SessionScheduleEndDto,
  type SessionScheduleInputDto,
  type SessionScheduleReplacementDto,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { isBranchSessionsKey } from "./schedule-queries";

export type ScheduleChange =
  | { kind: "create-session"; input: SessionInputDto }
  | { kind: "create-schedule"; input: SessionScheduleInputDto }
  | { kind: "update-session"; sessionId: string; input: SessionChangeDto }
  | {
      kind: "replace-schedule";
      scheduleId: string;
      input: SessionScheduleInputDto;
    }
  | { kind: "end-schedule"; scheduleId: string; effectiveFrom: string }
  | { kind: "cancel-session"; sessionId: string };

export type ScheduleChangeResult =
  | { kind: "create-session" }
  | { kind: "create-schedule"; result: SessionScheduleCreationDto }
  | { kind: "update-session" }
  | { kind: "replace-schedule"; result: SessionScheduleReplacementDto }
  | { kind: "end-schedule"; result: SessionScheduleEndDto }
  | { kind: "cancel-session"; result: SessionCancellationDto };

async function send(change: ScheduleChange): Promise<ScheduleChangeResult> {
  switch (change.kind) {
    case "create-session":
      await createOneOffSession(change.input, undefined, adminFetch);
      return { kind: change.kind };
    case "create-schedule":
      return {
        kind: change.kind,
        result: (
          await createSessionSchedule(change.input, undefined, adminFetch)
        ).data as SessionScheduleCreationDto,
      };
    case "update-session":
      await updateSession(
        change.sessionId,
        change.input,
        undefined,
        adminFetch,
      );
      return { kind: change.kind };
    case "replace-schedule":
      return {
        kind: change.kind,
        result: (
          await replaceSessionSchedule(
            change.scheduleId,
            change.input,
            undefined,
            adminFetch,
          )
        ).data as SessionScheduleReplacementDto,
      };
    case "end-schedule":
      return {
        kind: change.kind,
        result: (
          await endSessionSchedule(
            change.scheduleId,
            { effectiveFrom: change.effectiveFrom },
            undefined,
            adminFetch,
          )
        ).data as SessionScheduleEndDto,
      };
    case "cancel-session":
      return {
        kind: change.kind,
        result: (await cancelSession(change.sessionId, undefined, adminFetch))
          .data as SessionCancellationDto,
      };
  }
}

/**
 * ADR-0042: every schedule change refetches exactly the selected Branch's
 * cached weeks and weekly schedules; other Branches' weeks stay as they are.
 */
export function useScheduleChange(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          predicate: isBranchSessionsKey(branchId),
        }),
        queryClient.invalidateQueries({
          queryKey: getListSessionSchedulesQueryKey({ branchId }),
        }),
      ]),
  });
}
