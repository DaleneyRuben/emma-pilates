import type { MonthKpiCounts } from './month-kpis';
import type { RecommendationFinding } from './recommend-from-facts';
import { answerQuestion, narrateMonth } from './narrate-month';

const counts = (overrides: Partial<MonthKpiCounts> = {}): MonthKpiCounts => ({
  sessionsHeld: 20,
  occupancyPercent: 59,
  averageStudentsTimes10: 65,
  averageAttendanceTimes10: 55,
  noShowPercent: 15,
  activeClients: 8,
  newClients: 1,
  renewedClients: 4,
  renewalPercent: 50,
  ...overrides,
});

const finding = (
  overrides: Partial<RecommendationFinding> = {},
): RecommendationFinding => ({
  rule: 'inactive_client',
  subject: '11111111-1111-4111-8111-111111111111',
  period: '2026-10-01',
  detail: 'Contacta a la clienta: tiene un plan vigente y no reservó este mes.',
  ...overrides,
});

describe('narrate month', () => {
  it('says no classes were held and offers no action', () => {
    const result = narrateMonth({
      month: '2026-10',
      kpis: counts({ sessionsHeld: 0, occupancyPercent: 0, activeClients: 0 }),
      recommendations: [finding()],
      subject: finding().subject,
    });

    expect(result.paragraphs).toEqual([
      'En octubre de 2026 no se dictaron clases.',
    ]);
    expect(result.actions).toEqual([]);
  });

  it('states the held sessions, occupancy, active clients, and renewal from the input digits', () => {
    const result = narrateMonth({
      month: '2026-10',
      kpis: counts(),
      recommendations: [],
      subject: 'ana@example.com',
    });

    expect(result.paragraphs[0]).toBe(
      'En octubre de 2026 se dictaron 20 clases, con una ocupación del 59 %. Había 8 clientas activas.',
    );
    expect(result.paragraphs.join(' ')).toContain('50 %');
    expect(result.paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(result.paragraphs.length).toBeLessThanOrEqual(4);
  });

  it('turns each recommendation detail into an action and caps them at 3', () => {
    const details = [
      'Revisa el horario del lunes: promedia 1,7 alumnas.',
      'Revisa el horario del martes: promedia 2 alumnas.',
      'Revisa el horario del miércoles: promedia 1 alumna.',
      'Contacta a la clienta: tiene un plan vigente y no reservó este mes.',
    ];
    const result = narrateMonth({
      month: '2026-10',
      kpis: counts(),
      recommendations: details.map((detail, index) =>
        finding({ subject: `client-${index}`, detail }),
      ),
      subject: 'client-0',
    });

    expect(result.actions).toHaveLength(3);
    expect(result.actions.map((action) => action.because)).toEqual(
      details.slice(0, 3),
    );
    expect(result.actions[0]?.text.length).toBeGreaterThan(0);
  });

  it('never interpolates a client id, a name, or an email from the subject', () => {
    const subject = '11111111-1111-4111-8111-111111111111';
    const result = narrateMonth({
      month: '2026-01',
      kpis: counts(),
      recommendations: [finding({ subject })],
      subject,
    });
    const text = JSON.stringify(result);

    expect(text).not.toContain(subject);
    expect(text).not.toContain('ana@example.com');
    expect(result.paragraphs[0]).toContain('enero de 2026');
  });
});

describe('answer question', () => {
  const aggregates = counts();

  it('answers occupancy from a normalized substring', () => {
    const result = answerQuestion('¿Cuál es la ocupación?', aggregates);

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('59');
    expect(result.answer).toContain('ocupación');
  });

  it('answers active clients from an accented question', () => {
    const result = answerQuestion(
      '¿Cuántas clientas activas hay?',
      aggregates,
    );

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('8');
  });

  it('refuses a question that names a person', () => {
    const result = answerQuestion('¿Cómo le fue a Ana Mendoza?', aggregates);

    expect(result).toEqual({
      refused: true,
      answer:
        'Solo puedo responder sobre los indicadores del mes. Pregunta por la ocupación o por las clientas activas.',
    });
  });
});
