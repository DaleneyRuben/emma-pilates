import { recommendFromFacts } from './recommend-from-facts';

const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const session = (
  trainerStaffMemberId: string,
  sessionDate: string,
  bookingsAtWindowClose: number,
) => ({
  trainerStaffMemberId,
  sessionDate: date(sessionDate),
  bookingsAtWindowClose,
});

describe('recommend from facts', () => {
  const month = date('2026-10-01');
  const today = date('2026-10-23');

  it('flags a trainer weekday that held at least 3 sessions averaging below 3 bookings', () => {
    // 6, 13, and 20 October 2026 are Tuesdays. 2 + 1 + 2 = 5, average 1.666…,
    // shown as 1,7. The subject is the trainer id and the ISO weekday.
    const findings = recommendFromFacts({
      sessions: [
        session('trainer-ana', '2026-10-06', 2),
        session('trainer-ana', '2026-10-13', 1),
        session('trainer-ana', '2026-10-20', 2),
      ],
      clientMonths: [],
      month,
      today,
    });

    expect(findings).toEqual([
      {
        rule: 'weak_schedule',
        subject: 'trainer-ana:2',
        period: '2026-10-01',
        detail: 'Revisa el horario del martes: promedia 1,7 alumnas.',
      },
    ]);
  });

  it('does not flag a weekday with fewer than 3 sessions or an average of 3', () => {
    const findings = recommendFromFacts({
      sessions: [
        session('trainer-ana', '2026-10-06', 0),
        session('trainer-ana', '2026-10-13', 0),
        session('trainer-bea', '2026-10-05', 3),
        session('trainer-bea', '2026-10-12', 3),
        session('trainer-bea', '2026-10-19', 3),
      ],
      clientMonths: [],
      month,
      today,
    });

    expect(findings).toEqual([]);
  });

  it('keeps trainers and weekdays in separate groups and names no client', () => {
    const findings = recommendFromFacts({
      sessions: [
        session('trainer-ana', '2026-10-05', 1),
        session('trainer-ana', '2026-10-12', 1),
        session('trainer-ana', '2026-10-19', 1),
        session('trainer-bea', '2026-10-05', 0),
        session('trainer-bea', '2026-10-12', 0),
        session('trainer-bea', '2026-10-19', 0),
      ],
      clientMonths: [],
      month,
      today,
    });

    expect(findings.map((finding) => finding.subject)).toEqual([
      'trainer-ana:1',
      'trainer-bea:1',
    ]);
    expect(findings[0]?.detail).toBe(
      'Revisa el horario del lunes: promedia 1 alumnas.',
    );
    expect(findings.every((finding) => !finding.detail.includes('@'))).toBe(
      true,
    );
  });

  it('flags a current-month client with a plan and no booking and no attendance', () => {
    const findings = recommendFromFacts({
      sessions: [],
      clientMonths: [
        {
          clientId: 'client-luz',
          month: '2026-10',
          planDays: 30,
          classesBooked: 0,
          classesAttended: 0,
          renewed: false,
        },
      ],
      month,
      today,
    });

    expect(findings).toEqual([
      {
        rule: 'inactive_client',
        subject: 'client-luz',
        period: '2026-10-01',
        detail:
          'Contacta a la clienta: tiene un plan vigente y no reservó este mes.',
      },
    ]);
  });

  it('does not flag inactivity outside the current month, without a plan, or after a booking', () => {
    const findings = recommendFromFacts({
      sessions: [],
      clientMonths: [
        {
          clientId: 'past',
          month: '2026-09',
          planDays: 30,
          classesBooked: 0,
          classesAttended: 0,
          renewed: false,
        },
        {
          clientId: 'no-plan',
          month: '2026-10',
          planDays: 0,
          classesBooked: 0,
          classesAttended: 0,
          renewed: false,
        },
        {
          clientId: 'booked',
          month: '2026-10',
          planDays: 12,
          classesBooked: 1,
          classesAttended: 0,
          renewed: false,
        },
      ],
      month,
      today,
    });

    expect(findings).toEqual([]);
  });

  it('does not treat an unrenewed plan as a renewal gap, because the fact cannot show expiry', () => {
    const findings = recommendFromFacts({
      sessions: [],
      clientMonths: [
        {
          clientId: 'client-ana',
          month: '2026-09',
          planDays: 30,
          classesBooked: 4,
          classesAttended: 4,
          renewed: false,
        },
      ],
      month: date('2026-09-01'),
      today,
    });

    expect(findings.map((finding) => finding.rule)).not.toContain(
      'renewal_gap',
    );
    expect(findings).toEqual([]);
  });
});
