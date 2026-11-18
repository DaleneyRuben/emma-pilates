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
  minimumCancellations: 0,
  ...overrides,
});

const finding = (
  overrides: Partial<RecommendationFinding> & { state?: string } = {},
): RecommendationFinding & { state?: string } => ({
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

  it('splits each schedule detail into the action and the fact behind it', () => {
    const result = narrateMonth({
      month: '2026-10',
      kpis: counts(),
      recommendations: [
        finding({
          rule: 'weak_schedule',
          subject: 'trainer:2',
          detail:
            'Revisa el horario del martes: promedia 1,7 alumnas en 4 clases.',
        }),
      ],
    });

    expect(result.actions).toEqual([
      {
        text: 'Revisa el horario del martes.',
        because: 'Promedia 1,7 alumnas en 4 clases.',
      },
    ]);
  });

  it('groups inactive clients into one action and counts every recommendation', () => {
    const schedules = ['lunes', 'martes', 'miércoles'].map((day, index) =>
      finding({
        rule: 'weak_schedule',
        subject: `trainer:${index + 1}`,
        detail: `Revisa el horario del ${day}: promedia 1 alumna en 3 clases.`,
      }),
    );
    const result = narrateMonth({
      month: '2026-10',
      kpis: counts(),
      recommendations: [
        ...[1, 2, 3, 4, 5].map((index) => finding({ subject: `c-${index}` })),
        ...schedules,
      ],
    });

    expect(result.paragraphs).toContain(
      'Hay 8 recomendaciones para revisar. Estas son las principales, cada una con el dato que la sostiene.',
    );
    expect(result.actions).toHaveLength(3);
    expect(result.actions[0]).toEqual({
      text: 'Contacta a las 5 clientas que no reservaron este mes.',
      because: 'Tienen un plan vigente y no reservaron ninguna clase este mes.',
    });
    expect(result.actions[1]?.text).toBe('Revisa el horario del lunes.');
  });

  it('speaks of one recommendation and one client in the singular', () => {
    const result = narrateMonth({
      month: '2026-10',
      kpis: counts({ sessionsHeld: 1, activeClients: 1 }),
      recommendations: [finding()],
    });

    expect(result.paragraphs[0]).toBe(
      'En octubre de 2026 se dictó 1 clase, con una ocupación del 59 %. Había 1 clienta activa.',
    );
    expect(result.paragraphs).toContain(
      'Hay 1 recomendación para revisar, con el dato que la sostiene.',
    );
    expect(result.actions).toEqual([
      {
        text: 'Contacta a la clienta que no reservó este mes.',
        because: 'Tiene un plan vigente y no reservó ninguna clase este mes.',
      },
    ]);
  });

  it('leaves dismissed and resolved recommendations out', () => {
    const result = narrateMonth({
      month: '2026-10',
      kpis: counts(),
      recommendations: [
        finding({ state: 'dismissed' }),
        finding({ subject: 'c-2', state: 'resolved' }),
      ],
    });

    expect(result.actions).toEqual([]);
    expect(result.paragraphs.join(' ')).not.toContain('recomendaci');
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
    const result = answerQuestion('¿Cuántas clientas activas hay?', aggregates);

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('8');
  });

  it('refuses a question that names a person', () => {
    const result = answerQuestion('¿Cómo le fue a Ana Mendoza?', aggregates);

    expect(result).toEqual({
      refused: true,
      answer:
        'Solo puedo responder sobre los indicadores del mes. Pregunta por la ocupación, las clientas activas o las clases canceladas.',
    });
  });

  // Walkthrough finding 107 (e).
  it('answers why so many classes were cancelled from the minimum count', () => {
    const result = answerQuestion(
      '¿Por qué hubo tantas clases canceladas?',
      counts({ sessionsHeld: 35, minimumCancellations: 54 }),
    );

    expect(result).toEqual({
      refused: false,
      answer:
        'Se cancelaron 54 clases por no llegar al mínimo de reservas, y se dictaron 35.',
    });
  });

  it('answers a single cancellation and none in their own words', () => {
    expect(
      answerQuestion(
        'cancelaciones',
        counts({ sessionsHeld: 1, minimumCancellations: 1 }),
      ).answer,
    ).toBe(
      'Se canceló 1 clase por no llegar al mínimo de reservas, y se dictó 1.',
    );
    expect(answerQuestion('¿Se canceló alguna?', counts()).answer).toBe(
      'Ninguna clase se canceló por no llegar al mínimo de reservas.',
    );
  });

  it('does not answer a client cancellation with the minimum count', () => {
    expect(
      answerQuestion('¿Cuántas clientas cancelaron sus reservas?', counts())
        .refused,
    ).toBe(true);
  });

  it('says no class was held beside the cancellations', () => {
    expect(
      answerQuestion(
        'clases canceladas',
        counts({ sessionsHeld: 0, minimumCancellations: 4 }),
      ).answer,
    ).toBe(
      'Se cancelaron 4 clases por no llegar al mínimo de reservas, y no se dictó ninguna.',
    );
  });

  it('mentions the minimum cancellations in the month report', () => {
    const result = narrateMonth({
      month: '2026-11',
      kpis: counts({ sessionsHeld: 35, minimumCancellations: 54 }),
      recommendations: [],
    });

    expect(result.paragraphs).toContain(
      'Se cancelaron 54 clases por no llegar al mínimo de reservas.',
    );
  });
});
