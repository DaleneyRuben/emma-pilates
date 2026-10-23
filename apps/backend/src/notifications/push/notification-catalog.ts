// ADR-0070: sound and lock-screen text are separate, explicit choices per
// notification type. `entry` shows the inbox entry's own title and message;
// types whose message names an Evaluation, a Client, a rejection reason, or an
// amount use generic copy instead (ADR-0025). The inbox keeps the full text.
export type PushPresentation = {
  sound: boolean;
  lockScreen: 'entry' | { title: string; body: string };
};

const catalog: Record<string, PushPresentation> = {
  waitlist_promoted: { sound: true, lockScreen: 'entry' },
  session_cancelled: { sound: true, lockScreen: 'entry' },
  session_rescheduled_by_studio: { sound: true, lockScreen: 'entry' },
  session_assigned: { sound: true, lockScreen: 'entry' },
  evaluation_reminder_day: {
    sound: true,
    lockScreen: {
      title: 'Recordatorio',
      body: 'Tienes una cita próxima. Abre la app para ver el detalle.',
    },
  },
  evaluation_reminder_hour: {
    sound: true,
    lockScreen: {
      title: 'Recordatorio',
      body: 'Tienes una cita próxima. Abre la app para ver el detalle.',
    },
  },
  class_reminder_day: {
    sound: true,
    lockScreen: {
      title: 'Recordatorio',
      body: 'Tienes una clase próxima. Abre la app para ver el detalle.',
    },
  },
  class_reminder_hour: {
    sound: true,
    lockScreen: {
      title: 'Recordatorio',
      body: 'Tienes una clase próxima. Abre la app para ver el detalle.',
    },
  },
  evaluation_cancelled_by_studio: {
    sound: true,
    lockScreen: {
      title: 'Cambio en tu agenda',
      body: 'El estudio hizo un cambio en tu agenda. Abre la app para ver el detalle.',
    },
  },
  payment_submitted: { sound: true, lockScreen: 'entry' },
  payment_rejected: {
    sound: true,
    lockScreen: {
      title: 'Comprobante rechazado',
      body: 'Revisa tu pago en la app.',
    },
  },
  evaluation_booked: {
    sound: false,
    lockScreen: {
      title: 'Nueva cita',
      body: 'Tienes una nueva cita en tu agenda.',
    },
  },
  evaluation_cancelled: {
    sound: false,
    lockScreen: {
      title: 'Cita cancelada',
      body: 'Se canceló una cita de tu agenda.',
    },
  },
  payment_confirmed: { sound: false, lockScreen: 'entry' },
  subscription_expiring: { sound: false, lockScreen: 'entry' },
};

// A type added without a catalog entry stays silent and private until its
// journey justifies more.
const uncatalogued: PushPresentation = {
  sound: false,
  lockScreen: {
    title: 'Emma Pilates',
    body: 'Tienes una notificación nueva.',
  },
};

export const presentNotification = (type: string): PushPresentation =>
  Object.hasOwn(catalog, type) ? catalog[type] : uncatalogued;
