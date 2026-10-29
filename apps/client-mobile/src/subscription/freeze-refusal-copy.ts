const freezeRefusalCopy: Record<string, string> = {
  freeze_not_allowed: "Este plan no se puede congelar.",
  invalid_civil_date: "Esas fechas no son válidas.",
};

export const freezeRequestFailure = (body: unknown): string => {
  if (typeof body === "object" && body !== null) {
    const code = (body as { code?: unknown }).code;
    if (typeof code === "string" && freezeRefusalCopy[code] !== undefined) {
      return freezeRefusalCopy[code];
    }
  }
  return "No pudimos enviar la solicitud. Inténtalo de nuevo.";
};
