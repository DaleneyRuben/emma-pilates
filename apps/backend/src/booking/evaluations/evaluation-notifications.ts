import type { NewNotification } from '../../notifications/prisma-notification-store';

// ADR-0070 sound flags and ADR-0025 lock-screen text for the Evaluation types.
// The inbox copy may name the day and time; push text never carries
// Evaluation details. Push delivery (NOT-002) reads these definitions.
export type EvaluationNotificationType =
  | 'evaluation_booked'
  | 'evaluation_cancelled'
  | 'evaluation_cancelled_by_studio'
  | 'evaluation_rescheduled'
  | 'evaluation_reschedule_required'
  | 'evaluation_reminder_day'
  | 'evaluation_reminder_hour';

export const evaluationPushCatalog: Record<
  EvaluationNotificationType,
  { sound: 'silent' | 'audible'; pushTitle: string; pushBody: string }
> = {
  evaluation_booked: {
    sound: 'silent',
    pushTitle: 'Tu agenda cambió',
    pushBody: 'Tienes una novedad en tu agenda.',
  },
  evaluation_cancelled: {
    sound: 'silent',
    pushTitle: 'Tu agenda cambió',
    pushBody: 'Tienes una novedad en tu agenda.',
  },
  evaluation_cancelled_by_studio: {
    sound: 'audible',
    pushTitle: 'Tienes un aviso',
    pushBody: 'Hay un cambio en una de tus citas.',
  },
  evaluation_rescheduled: {
    sound: 'silent',
    pushTitle: 'Tu agenda cambió',
    pushBody: 'Tienes una novedad en tu agenda.',
  },
  evaluation_reschedule_required: {
    sound: 'audible',
    pushTitle: 'Tienes un aviso',
    pushBody: 'Hay un cambio en una de tus citas.',
  },
  evaluation_reminder_day: {
    sound: 'audible',
    pushTitle: 'Recordatorio',
    pushBody: 'Tienes un recordatorio de tu cita.',
  },
  evaluation_reminder_hour: {
    sound: 'audible',
    pushTitle: 'Recordatorio',
    pushBody: 'Tienes un recordatorio de tu cita.',
  },
};

const momentParts = (instant: Date): Record<string, string> =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

const clockTime = (instant: Date): string => {
  const parts = momentParts(instant);
  return `${parts.hour}:${parts.minute}`;
};

// "lunes 28 de septiembre, 09:45" in Bolivia time.
export const formatEvaluationMoment = (instant: Date): string => {
  const parts = momentParts(instant);
  return `${parts.weekday} ${parts.day} de ${parts.month}, ${parts.hour}:${parts.minute}`;
};

// «este mes» when the Evaluation is in the month the notice is sent, else
// «para octubre»: an Evaluation can be booked for the next month (MOB-022).
const freedMonth = (startsAt: Date, occurredAt: Date): string => {
  const evaluationMonth = momentParts(startsAt).month;
  const noticeMonth = momentParts(occurredAt).month;
  return evaluationMonth === noticeMonth
    ? 'este mes'
    : `para ${evaluationMonth}`;
};

type EvaluationFacts = {
  evaluationId: string;
  startsAt: Date;
  occurredAt: Date;
};

export const evaluationBookedNotice = (
  facts: EvaluationFacts & { accountId: string; clientName: string },
): NewNotification => ({
  accountId: facts.accountId,
  category: 'booking_schedule',
  type: 'evaluation_booked',
  businessEventKey: `evaluation-booked:${facts.evaluationId}`,
  title: 'Nueva evaluación',
  message: `Nueva evaluación agendada: ${formatEvaluationMoment(facts.startsAt)}, con ${facts.clientName}.`,
  destination: { type: 'nutritionist_agenda', id: null },
  occurredAt: facts.occurredAt,
});

export const evaluationCancelledNotice = (
  facts: EvaluationFacts & { accountId: string; clientName: string },
): NewNotification => ({
  accountId: facts.accountId,
  category: 'booking_schedule',
  type: 'evaluation_cancelled',
  businessEventKey: `evaluation-cancelled:${facts.evaluationId}`,
  title: 'Evaluación cancelada',
  message: `${facts.clientName} canceló su evaluación del ${formatEvaluationMoment(facts.startsAt)}.`,
  destination: { type: 'nutritionist_agenda', id: null },
  occurredAt: facts.occurredAt,
});

export const evaluationCancelledByStudioNotice = (
  facts: EvaluationFacts & { accountId: string },
): NewNotification => ({
  accountId: facts.accountId,
  category: 'booking_schedule',
  type: 'evaluation_cancelled_by_studio',
  businessEventKey: `evaluation-cancelled:${facts.evaluationId}`,
  title: 'Evaluación cancelada',
  message: `El estudio canceló tu evaluación nutricional del ${formatEvaluationMoment(facts.startsAt)}. Ya puedes reservar otra ${freedMonth(facts.startsAt, facts.occurredAt)}.`,
  destination: { type: 'evaluation', id: facts.evaluationId },
  occurredAt: facts.occurredAt,
});

export const evaluationRescheduledNotice = (
  facts: EvaluationFacts & {
    accountId: string;
    clientName: string;
    previousStartsAt: Date;
  },
): NewNotification => ({
  accountId: facts.accountId,
  category: 'booking_schedule',
  type: 'evaluation_rescheduled',
  businessEventKey: `evaluation-rescheduled:${facts.evaluationId}:${facts.startsAt.toISOString()}`,
  title: 'Evaluación reprogramada',
  message: `${facts.clientName} reprogramó su evaluación del ${formatEvaluationMoment(facts.previousStartsAt)} al ${formatEvaluationMoment(facts.startsAt)}.`,
  destination: { type: 'nutritionist_agenda', id: null },
  occurredAt: facts.occurredAt,
});

export const evaluationRescheduleRequiredNotice = (
  facts: EvaluationFacts & { accountId: string },
): NewNotification => ({
  accountId: facts.accountId,
  category: 'booking_schedule',
  type: 'evaluation_reschedule_required',
  businessEventKey: `evaluation-reschedule-required:${facts.evaluationId}:${facts.startsAt.toISOString()}`,
  title: 'Elige otro turno',
  message: `El estudio canceló el turno de tu evaluación del ${formatEvaluationMoment(facts.startsAt)}. El pago sigue vigente. Elige otro turno.`,
  destination: { type: 'evaluation', id: facts.evaluationId },
  occurredAt: facts.occurredAt,
});

export const evaluationReminderNotice = (
  facts: EvaluationFacts & { accountId: string; kind: 'day' | 'hour' },
): NewNotification => ({
  accountId: facts.accountId,
  category: 'reminder',
  type:
    facts.kind === 'day'
      ? 'evaluation_reminder_day'
      : 'evaluation_reminder_hour',
  businessEventKey: `evaluation-reminder-${facts.kind}:${facts.evaluationId}`,
  title: 'Recordatorio',
  message:
    facts.kind === 'day'
      ? `Recordatorio: tu evaluación nutricional es mañana a las ${clockTime(facts.startsAt)}.`
      : `Recordatorio: tu evaluación nutricional es en una hora, a las ${clockTime(facts.startsAt)}.`,
  destination: { type: 'evaluation', id: facts.evaluationId },
  occurredAt: facts.occurredAt,
});
