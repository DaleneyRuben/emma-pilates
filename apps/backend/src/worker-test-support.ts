// Occurrence job doubles shared by the worker entrypoint specs.
export const occurrenceJobs = () => ({
  first90Days: {
    execute: jest.fn().mockResolvedValue({ messages: 0, alerts: 0 }),
  },
  pushDispatch: { dispatch: jest.fn() },
  pushReceipts: {
    execute: jest
      .fn()
      .mockResolvedValue({ discarded: 0, checked: 0, delivered: 0, failed: 0 }),
  },
  sessionSchedules: {
    execute: jest
      .fn()
      .mockResolvedValue({ schedules: 0, created: 0, skipped: 0 }),
  },
  evaluationSlots: {
    execute: jest.fn().mockResolvedValue({ blocks: 0, created: 0, skipped: 0 }),
  },
  evaluationReminders: {
    execute: jest.fn().mockResolvedValue({ sent: 0 }),
  },
  minimumBookingsChecks: {
    execute: jest.fn().mockResolvedValue({ checked: 0, cancelled: 0 }),
  },
  windowCloseSnapshots: {
    execute: jest.fn().mockResolvedValue({ recorded: 0 }),
  },
  startedSessionWaitlists: {
    execute: jest.fn().mockResolvedValue({ closed: 0 }),
  },
  trainerPayDrafts: {
    execute: jest.fn().mockResolvedValue({ drafted: 0 }),
  },
  retentionSweeps: {
    execute: jest.fn().mockResolvedValue({
      idempotencyRecords: 0,
      authenticationSessions: 0,
      throttleEvents: 0,
      notifications: 0,
    }),
  },
});
