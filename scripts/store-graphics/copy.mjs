// What each store image says, per app, in store order. Literal Spanish and
// never a price or the launch discount: the offer is temporary (owner,
// 2026-11-03). A shot's `file` names its raw capture in raw/<app>/<device>/.
export const apps = {
  client: {
    logo: { file: "apps/admin-web/public/emma-logo.png", kind: "wordmark" },
    feature: {
      label: "La app del estudio",
      title: "Tus clases de Pilates, a un toque",
      note: "Reserva, revisa tu plan y paga con QR.",
    },
    shots: [
      { file: "1-reservar", eyebrow: "Reservar", title: "Reserva tu lugar en segundos", note: "Elige el día, la hora y el tipo de clase." },
      { file: "2-clase", eyebrow: "Cada clase", title: "Quién la da y cuántos cupos quedan", note: "Todo lo que necesitas saber antes de reservar." },
      { file: "3-inicio", eyebrow: "Tu plan", title: "Tus clases, de un vistazo", note: "Cuántas te quedan y hasta cuándo, apenas abres la app." },
      { file: "4-reservas", eyebrow: "Mis reservas", title: "Tus reservas, siempre a mano", note: "Cancela o cambia de horario sin llamar al estudio." },
      // On a phone the frame rises and the screen scrolls so «Tus invitadas» shows.
      { file: "5-invita", eyebrow: "Invita a una amiga", title: "Comparte tu código con tus amigas", note: "Ella toma una clase gratis y tú ganas otra.", phone: { top: 300, scrollTop: 0.16 } },
    ],
  },
  staff: {
    logo: { file: "apps/staff-mobile/assets/icon.png", kind: "icon" },
    feature: {
      label: "Para el equipo",
      title: "Emma Pilates Staff",
      note: "Agenda, clientas y pagos del estudio, en una sola app.",
    },
    shots: [
      { file: "1-agenda", eyebrow: "Agenda", title: "Tu agenda de clases, día por día", note: "Cada entrenadora ve sus clases y quién reservó." },
      { file: "2-asistentes", eyebrow: "Asistencia", title: "Marca la asistencia en un toque", note: "Desde que empieza la clase, con la lista de quienes reservaron." },
      { file: "3-buscar", eyebrow: "Recepción", title: "Encuentra a cada clienta en segundos", note: "Por nombre, teléfono o correo." },
      { file: "4-clienta", eyebrow: "Clientas", title: "Reserva y registra pagos desde recepción", note: "Su plan, sus reservas y su historial juntos." },
      { file: "5-codigo", eyebrow: "Tu código", title: "Tu código, para tus alumnas", note: "Las que se registren con él quedan contigo." },
    ],
  },
};
