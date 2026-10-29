export const freezeRequestFailure = (body: unknown): string => {
  if (typeof body === "object" && body !== null) {
    const code = (body as { code?: unknown }).code;
    if (code === "freeze_not_allowed") return "Este plan no se puede congelar.";
  }
  return "No pudimos enviar la solicitud. Inténtalo de nuevo.";
};
