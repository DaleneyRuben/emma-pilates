import type { ContactAlertReason } from './first-90-days-alerts';
import type { LifecycleMilestone } from './first-90-days-milestones';

export const lifecycleCopy: Record<
  LifecycleMilestone,
  { title: string; message: string }
> = {
  day_2: {
    title: 'Tu segunda clase',
    message:
      '¿Cómo te fue en tu primera clase? Tu segunda clase es el mejor momento para afianzar lo que aprendiste. Reserva cuando quieras: tu lugar te espera.',
  },
  week_1: {
    title: 'Tu primera semana',
    message:
      '¿Cómo te sentiste en tus primeras clases? Si tienes alguna duda sobre los ejercicios o el nivel, cuéntale a tu instructora: estamos para acompañarte.',
  },
  day_30: {
    title: 'Tu primer mes',
    message:
      'Cumpliste tu primer mes con nosotras. Cuéntanos cómo te has sentido y qué te gustaría trabajar ahora: tu instructora te ayuda a elegir.',
  },
  day_90: {
    title: 'Tres meses con nosotras',
    message:
      'Tres meses practicando es un logro. Gracias por confiar en Emma. Si quieres seguir, tu próximo plan te espera cuando lo decidas.',
  },
};

export const contactAlertCopy: Record<ContactAlertReason, string> = {
  no_booking_7_days: '7 días sin reservar',
  fewer_than_2_classes_by_day_15: 'Menos de 2 clases a los 15 días',
  fewer_than_4_classes_in_first_30_days: 'Menos de 4 clases en su primer mes',
};
