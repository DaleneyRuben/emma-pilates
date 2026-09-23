import { plannedSessions } from './session-materialization';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
const at = (instant: string): Date => new Date(instant);

// Tuesday 2026-09-22, 11:00 in Bolivia.
const clock = {
  today: civil('2026-09-22'),
  now: at('2026-09-22T15:00:00.000Z'),
};

const mondayReformer = {
  weekday: 1,
  startMinutes: 7 * 60,
  durationMinutes: 50,
  effectiveFrom: civil('2026-09-01'),
  effectiveUntil: null,
};

describe('Session materialization', () => {
  it('plans every matching weekday of the horizon at the Bolivia wall-clock start for the Class Type duration', () => {
    expect(plannedSessions(mondayReformer, clock)).toEqual([
      {
        startsAt: at('2026-09-28T11:00:00.000Z'),
        endsAt: at('2026-09-28T11:50:00.000Z'),
      },
      {
        startsAt: at('2026-10-05T11:00:00.000Z'),
        endsAt: at('2026-10-05T11:50:00.000Z'),
      },
      {
        startsAt: at('2026-10-12T11:00:00.000Z'),
        endsAt: at('2026-10-12T11:50:00.000Z'),
      },
      {
        startsAt: at('2026-10-19T11:00:00.000Z'),
        endsAt: at('2026-10-19T11:50:00.000Z'),
      },
    ]);
  });

  it('includes today when it has not started yet and skips it once started', () => {
    const tuesday = (hours: number) =>
      plannedSessions(
        { ...mondayReformer, weekday: 2, startMinutes: hours * 60 },
        clock,
      ).map((session) => session.startsAt);

    expect(tuesday(18)[0]).toEqual(at('2026-09-22T22:00:00.000Z'));
    expect(tuesday(18)).toHaveLength(5);
    expect(tuesday(11)[0]).toEqual(at('2026-09-29T15:00:00.000Z'));
    expect(tuesday(11)).toHaveLength(4);
  });

  it('includes the last horizon day', () => {
    const thursdays = plannedSessions({ ...mondayReformer, weekday: 4 }, clock);

    expect(thursdays).toHaveLength(5);
    expect(thursdays.at(-1)?.startsAt).toEqual(at('2026-10-22T11:00:00.000Z'));
  });

  it('starts at effectiveFrom and stops before the exclusive effectiveUntil', () => {
    expect(
      plannedSessions(
        {
          ...mondayReformer,
          effectiveFrom: civil('2026-10-05'),
          effectiveUntil: civil('2026-10-19'),
        },
        clock,
      ).map((session) => session.startsAt),
    ).toEqual([at('2026-10-05T11:00:00.000Z'), at('2026-10-12T11:00:00.000Z')]);
  });

  it('plans nothing for a schedule that ends by today or starts after the horizon', () => {
    expect(
      plannedSessions(
        { ...mondayReformer, effectiveUntil: civil('2026-09-22') },
        clock,
      ),
    ).toEqual([]);
    expect(
      plannedSessions(
        { ...mondayReformer, effectiveFrom: civil('2026-10-23') },
        clock,
      ),
    ).toEqual([]);
  });
});
