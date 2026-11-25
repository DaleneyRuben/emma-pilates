// What each store image says, per app, in store order. Literal Spanish and
// never a price or the launch discount: the offer is temporary (owner,
// 2026-11-03). A shot's `file` names its raw capture in raw/<app>/<device>/.
// Screenshots carry a label and a title only: in Rosa Emma small text may not
// sit on the rosa 100 ground (owner, 2026-11-21). The feature graphic keeps
// its note, on a white card. The App Store header carries only the studio's
// name, no tagline (owner, 2026-11-25).
export const apps = {
  client: {
    logo: { file: "apps/admin-web/public/emma-logo.png", kind: "wordmark" },
    feature: {
      label: "La app del estudio",
      title: "Tus clases de Pilates, a un toque",
      note: "Reserva, revisa tu plan y paga con QR.",
    },
    header: { logo: { file: "apps/admin-web/public/emma-logo.png", kind: "wordmark" } },
    shots: [
      { file: "1-reservar", eyebrow: "Reservar", title: "Reserva tu lugar en segundos" },
      { file: "2-clase", eyebrow: "Cada clase", title: "Quién la da y cuántos cupos quedan" },
      { file: "3-inicio", eyebrow: "Tu plan", title: "Tus clases, de un vistazo" },
      { file: "4-reservas", eyebrow: "Mis reservas", title: "Tus reservas, siempre a mano" },
      { file: "5-invita", eyebrow: "Invita a una amiga", title: "Comparte tu código con tus amigas" },
    ],
  },
  staff: {
    logo: { file: "apps/staff-mobile/assets/android-icon-foreground.png", kind: "tile" },
    feature: {
      label: "Para el equipo",
      title: "Emma Pilates Staff",
      note: "Agenda, clientas y pagos del estudio, en una sola app.",
    },
    header: {
      logo: { file: "apps/staff-mobile/assets/icon.png", kind: "icon" },
      label: "Staff",
      title: "Emma Pilates Studio",
    },
    shots: [
      { file: "1-agenda", eyebrow: "Agenda", title: "Tu agenda de clases, día por día" },
      { file: "2-asistentes", eyebrow: "Asistencia", title: "Marca la asistencia en un toque" },
      { file: "3-buscar", eyebrow: "Recepción", title: "Encuentra a cada clienta en segundos" },
      { file: "4-clienta", eyebrow: "Clientas", title: "Reserva y registra pagos desde recepción" },
      { file: "5-codigo", eyebrow: "Tu código", title: "Tu código, para tus alumnas" },
    ],
  },
};
