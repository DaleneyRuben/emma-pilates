import type { MonthKpiCounts } from './month-kpis';
import type { RecommendationFinding } from './recommend-from-facts';

// STU-007 narrates aggregates only. A later provider can replace these two
// functions. They never receive a name, and a subject passed beside the
// aggregates is ignored so a client id cannot leak into the text.

export type MonthNarrative = {
  paragraphs: string[];
  actions: { text: string; because: string }[];
};

export type QuestionAnswer = {
  answer: string;
  refused: boolean;
};

const monthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split('-');
  return `${monthNames[Number(monthNumber) - 1]} de ${year}`;
};

const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const refusal =
  'Solo puedo responder sobre los indicadores del mes. Pregunta por la ocupación o por las clientas activas.';

export const narrateMonth = (input: {
  month: string;
  kpis: MonthKpiCounts;
  recommendations: readonly Pick<RecommendationFinding, 'rule' | 'detail'>[];
  subject?: string;
}): MonthNarrative => {
  const label = monthLabel(input.month);
  if (input.kpis.sessionsHeld === 0) {
    return {
      paragraphs: [`En ${label} no se dictaron clases.`],
      actions: [],
    };
  }

  const { occupancyPercent, activeClients, renewalPercent, sessionsHeld } =
    input.kpis;
  const paragraphs = [
    `En ${label} se dictaron ${sessionsHeld} clases, con una ocupación del ${occupancyPercent} %. Había ${activeClients} clientas activas.`,
    `La renovación del mes fue del ${renewalPercent} %.`,
  ];
  if (input.recommendations.length > 0) {
    paragraphs.push(
      `Hay ${Math.min(input.recommendations.length, 3)} acciones para revisar, cada una con el dato que la sostiene.`,
    );
  }

  return {
    paragraphs,
    actions: input.recommendations.slice(0, 3).map((item) => ({
      text: item.detail,
      because: item.detail,
    })),
  };
};

export const answerQuestion = (
  question: string,
  aggregates: Pick<MonthKpiCounts, 'occupancyPercent' | 'activeClients'>,
): QuestionAnswer => {
  const normalized = normalize(question);
  if (normalized.includes('ocupacion')) {
    return {
      refused: false,
      answer: `La ocupación del mes fue del ${aggregates.occupancyPercent} %.`,
    };
  }
  if (normalized.includes('clientas activas')) {
    return {
      refused: false,
      answer: `Había ${aggregates.activeClients} clientas activas.`,
    };
  }
  return { refused: true, answer: refusal };
};
