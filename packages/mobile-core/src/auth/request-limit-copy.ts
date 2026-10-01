// The device or network email limit (ADR-0029, BE-012) names no address, so
// it only says whether a link the person holds keeps working.

/** Resend and correction: a link was already sent to this registration. */
export const limitKeepsCurrentLink =
  "Demasiadas solicitudes. Intenta de nuevo en un momento; el enlace que ya tienes sigue sirviendo.";

/** Registration and recovery: the person may or may not hold a link. */
export const limitKeepsAnyLink =
  "Demasiadas solicitudes. Intenta de nuevo en un momento; si ya recibiste un enlace, sigue sirviendo.";
