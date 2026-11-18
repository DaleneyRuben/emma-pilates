import type { MonthKpiCounts } from './month-kpis';
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

type NarratedRecommendation = { rule: string; detail: string; state?: string };

const capitalize = (text: string) =>
  text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;

// A finding's detail reads «action: fact». The action is what to do and the
// fact is why, so «Porque:» never repeats the action.
const splitDetail = (detail: string) => {
  const colon = detail.indexOf(': ');
  if (colon < 0) return { text: detail, because: detail };
  return {
    text: `${detail.slice(0, colon)}.`,
    because: capitalize(detail.slice(colon + 2)),
  };
};

// Inactive clients make one action: five identical «Contacta a la clienta»
// lines would say nothing the list below does not.
const inactiveAction = (count: number) =>
  count === 1
    ? {
        text: 'Contacta a la clienta que no reservó este mes.',
        because: 'Tiene un plan vigente y no reservó ninguna clase este mes.',
      }
    : {
        text: `Contacta a las ${count} clientas que no reservaron este mes.`,
        because:
          'Tienen un plan vigente y no reservaron ninguna clase este mes.',
      };

const actionsFrom = (recommendations: readonly NarratedRecommendation[]) => {
  const inactive = recommendations.filter(
    (item) => item.rule === 'inactive_client',
  ).length;
  return [
    ...(inactive === 0 ? [] : [inactiveAction(inactive)]),
    ...recommendations
      .filter((item) => item.rule !== 'inactive_client')
      .map((item) => splitDetail(item.detail)),
  ].slice(0, 3);
};

const countParagraph = (count: number) =>
  count === 1
    ? 'Hay 1 recomendación para revisar, con el dato que la sostiene.'
    : `Hay ${count} recomendaciones para revisar. Estas son las principales, cada una con el dato que la sostiene.`;

export const narrateMonth = (input: {
  month: string;
  kpis: MonthKpiCounts;
  recommendations: readonly NarratedRecommendation[];
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
  const held =
    sessionsHeld === 1
      ? 'se dictó 1 clase'
      : `se dictaron ${sessionsHeld} clases`;
  const active =
    activeClients === 1
      ? 'Había 1 clienta activa.'
      : `Había ${activeClients} clientas activas.`;
  const paragraphs = [
    `En ${label} ${held}, con una ocupación del ${occupancyPercent} %. ${active}`,
    `La renovación del mes fue del ${renewalPercent} %.`,
  ];
  // A discarded or resolved finding is no longer something to review.
  const open = input.recommendations.filter(
    (item) => item.state !== 'dismissed' && item.state !== 'resolved',
  );
  if (open.length > 0) paragraphs.push(countParagraph(open.length));

  return { paragraphs, actions: actionsFrom(open) };
};

export const narrativeFromReads = (input: {
  month: string;
  kpis: MonthKpiCounts;
  recommendations: readonly (NarratedRecommendation & { subject: string })[];
}): MonthNarrative =>
  narrateMonth({
    month: input.month,
    kpis: input.kpis,
    // The listed rows carry names for the page; only these fields go on.
    recommendations: input.recommendations.map(({ rule, detail, state }) => ({
      rule,
      detail,
      state,
    })),
    subject: input.recommendations.map((item) => item.subject).join(' '),
  });

export const questionFromCounts = (
  question: string,
  kpis: Pick<MonthKpiCounts, 'occupancyPercent' | 'activeClients'>,
) => answerQuestion(question, kpis);

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
