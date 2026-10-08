import {
  getTrainerSessionRoster,
  listTrainerSchedule,
  recordSessionAttendance,
  type TrainerRosterBookingDtoAttendanceOutcome,
  type TrainerScheduleSessionDto,
  type TrainerSessionRosterDto,
} from "@pilates/api-contracts";

type AttendanceOutcome = Exclude<TrainerRosterBookingDtoAttendanceOutcome, undefined>;

type AttendanceEntry = {
  bookingId: string;
  outcome: AttendanceOutcome;
};

export type TrainerApi = {
  getRoster: (sessionId: string) => Promise<TrainerSessionRosterDto>;
  listSchedule: (on: string) => Promise<TrainerScheduleSessionDto[]>;
  saveAttendance: (sessionId: string, outcomes: AttendanceEntry[]) => Promise<void>;
};

function requireSuccessfulResponse({ status }: { status: number }): void {
  if (status < 200 || status >= 300) {
    throw new Error("The Trainer request could not be completed");
  }
}

export function createTrainerApi(fetcher: typeof globalThis.fetch): TrainerApi {
  return {
    async getRoster(sessionId) {
      const response = await getTrainerSessionRoster(sessionId, undefined, fetcher);
      requireSuccessfulResponse(response);
      return response.data;
    },
    async listSchedule(on) {
      const response = await listTrainerSchedule({ on }, undefined, fetcher);
      requireSuccessfulResponse(response);
      return response.data;
    },
    async saveAttendance(sessionId, outcomes) {
      const response = await recordSessionAttendance(
        sessionId,
        {
          body: JSON.stringify({ outcomes }),
          headers: { "Content-Type": "application/json" },
        },
        fetcher,
      );
      requireSuccessfulResponse(response);
    },
  };
}
