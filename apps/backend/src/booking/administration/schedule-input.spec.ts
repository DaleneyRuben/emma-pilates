import { parseScheduleInput } from './administration.dto';
import { parseScheduleBatchInput } from './schedule-batch.dto';

const civil = (date: string) => new Date(`${date}T00:00:00.000Z`);
const ids = {
  branchId: '0b6c9f8e-2a4d-4c8e-9f1a-3b5d7e9f1a2c',
  classTypeId: '1c7d0a9f-3b5e-4d9f-8a2b-4c6e8f0a2b3d',
  trainerStaffMemberId: '2d8e1b0a-4c6f-4e0a-9b3c-5d7f9a1b3c4e',
};
const single = {
  ...ids,
  weekday: 3,
  startsAtLocal: '07:00',
  durationMinutes: 50,
  capacity: 12,
  effectiveFrom: '2026-11-09',
};
const rows = {
  ...ids,
  capacity: 12,
  effectiveFrom: '2026-11-09',
  rows: [{ weekday: 1, startsAtLocal: '07:00', durationMinutes: 50 }],
};

// BKM-018: «Vigente hasta» travels as an optional exclusive end date.
describe('weekly schedule input with an end date', () => {
  it('leaves the end out when the body leaves it out', () => {
    const parsed = parseScheduleInput(single);
    expect(parsed.success && parsed.data.effectiveUntil).toBeUndefined();
  });

  it('reads an end date, or null for no end', () => {
    const dated = parseScheduleInput({
      ...single,
      effectiveUntil: '2026-12-21',
    });
    expect(dated.success && dated.data.effectiveUntil).toEqual(
      civil('2026-12-21'),
    );
    const open = parseScheduleInput({ ...single, effectiveUntil: null });
    expect(open.success && open.data.effectiveUntil).toBeNull();
  });

  it('takes the same end for every row of a batch', () => {
    const parsed = parseScheduleBatchInput({
      ...rows,
      effectiveUntil: '2026-12-21',
    });
    expect(parsed.success && parsed.data.effectiveUntil).toEqual(
      civil('2026-12-21'),
    );
  });

  it('refuses a malformed end date', () => {
    expect(
      parseScheduleInput({ ...single, effectiveUntil: '21/12/2026' }).success,
    ).toBe(false);
    expect(
      parseScheduleBatchInput({ ...rows, effectiveUntil: 'pronto' }).success,
    ).toBe(false);
  });
});
