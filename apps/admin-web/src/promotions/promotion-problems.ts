import { isApiError } from "../api/problem";

const messages: Record<string, string> = {
  promotion_not_found:
    "Esta promoción ya no existe. Cierra el panel y vuelve a abrir la lista.",
  promotion_archived:
    "Esta promoción ya fue eliminada. Cierra el panel y vuelve a abrir la lista.",
  promotion_image_not_ready:
    "La imagen todavía se está procesando. Espera un momento y vuelve a intentarlo.",
  promotion_image_required: "Sube una imagen antes de publicar.",
  idempotency_key_reused:
    "Ya guardamos esta promoción con otros datos. Cierra el panel y vuelve a abrir la lista.",
  invalid_request: "Revisa los datos: hay un valor que no es válido.",
  invalid_promotion_value: "Revisa los datos: hay un valor que no es válido.",
  administration_access_denied:
    "No tienes permiso para cambiar las promociones.",
};

// The Promotion commands' refusals (UPL-002) by their stable code
// (ADR-0021), never by the problem's text.
export const promotionFailureMessage = (error: unknown): string =>
  (isApiError(error) ? messages[error.code] : undefined) ??
  "No pudimos guardar. Inténtalo de nuevo.";
