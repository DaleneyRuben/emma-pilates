// What each store image says, per app, in store order. Literal Spanish and
// never a price or the launch discount: the offer is temporary (owner,
// 2026-11-03). A shot's `file` names its raw capture in raw/<app>/<device>/.
// Screenshots carry a label and a title only (owner, 2026-11-21). The Play
// feature graphic and the App Store header (`brand`) carry only the studio's
// wordmark, no tagline; the Staff app adds «Equipo» (owner, 2026-11-25). The
// Staff app's grey icon never changes, but these graphics do not show it.
export const apps = {
  client: {
    brand: { logo: "apps/admin-web/public/emma-logo.png" },
    shots: [
      { file: "1-reservar", eyebrow: "Reservar", title: "Reserva tu lugar en segundos" },
      { file: "2-clase", eyebrow: "Cada clase", title: "Quién la da y cuántos cupos quedan" },
      { file: "3-inicio", eyebrow: "Tu plan", title: "Tus clases, de un vistazo" },
      { file: "4-reservas", eyebrow: "Mis reservas", title: "Tus reservas, siempre a mano" },
      { file: "5-invita", eyebrow: "Invita a una amiga", title: "Comparte tu código con tus amigas" },
    ],
  },
  staff: {
    brand: { logo: "apps/admin-web/public/emma-logo.png", label: "Equipo" },
    shots: [
      { file: "1-agenda", eyebrow: "Agenda", title: "Tu agenda de clases, día por día" },
      { file: "2-asistentes", eyebrow: "Asistencia", title: "Marca la asistencia en un toque" },
      { file: "3-buscar", eyebrow: "Recepción", title: "Encuentra a cada clienta en segundos" },
      { file: "4-clienta", eyebrow: "Clientas", title: "Reserva y registra pagos desde recepción" },
      { file: "5-codigo", eyebrow: "Tu código", title: "Tu código, para tus alumnas" },
    ],
  },
};
